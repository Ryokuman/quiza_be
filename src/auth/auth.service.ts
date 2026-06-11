import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID } from 'crypto';
import { verifySiweMessage } from './siwe.helper';
import { PrismaService } from '../database/prisma.service';
import { SocialAuthVerifier, type VerifiedSocialIdentity } from './social-auth.verifier';
import type { ISocialLogin } from './dto/social-login.dto';

/**
 * Nonce 저장소 (인메모리, TTL 10분).
 * SIWE replay attack을 방지하기 위해 nonce는 1회용이며 사용 후 즉시 폐기된다.
 * 다중 인스턴스 환경에서는 Redis로 교체 필요.
 */
const nonceStore = new Map<string, number>();

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly socialAuthVerifier: SocialAuthVerifier,
  ) {}

  /** SIWE 인증용 일회성 nonce를 생성한다. 만료된 nonce도 함께 정리. */
  generateNonce(): string {
    const now = Date.now();
    for (const [key, exp] of nonceStore) {
      if (exp < now) nonceStore.delete(key);
    }

    const nonce = randomBytes(16).toString('hex');
    nonceStore.set(nonce, now + 10 * 60 * 1000); // 10 min TTL
    return nonce;
  }

  /** nonce 유효성 검증. 유효하면 즉시 삭제하여 재사용을 방지한다. */
  validateNonce(nonce: string): boolean {
    const exp = nonceStore.get(nonce);
    if (!exp || exp < Date.now()) return false;
    nonceStore.delete(nonce); // 1회용 — 재사용 방지
    return true;
  }

  /**
   * MiniKit walletAuth()의 SIWE 서명을 검증하고 JWT를 발급한다.
   *
   * 검증 성공 시:
   * - wallet address를 소문자로 정규화하여 유저 식별자로 사용
   * - 기존 유저면 그대로, 신규 유저면 자동 생성 (upsert)
   * - JWT payload: { sub: userId, world_id: walletAddress }
   *
   * @param payload - MiniKit.walletAuth() 반환값 { message, signature, address }
   * @param nonce - 사전에 GET /auth/nonce로 발급받은 일회용 nonce
   */
  async verifySiweAuth(
    payload: { message: string; signature: string; address: string },
    nonce: string,
  ): Promise<{ access_token: string }> {
    if (!this.validateNonce(nonce)) {
      throw new BadRequestException('Invalid or expired nonce');
    }

    const { isValid, siweMessageData } = await verifySiweMessage(payload, nonce);

    if (!isValid) {
      throw new BadRequestException('Invalid SIWE signature');
    }

    // wallet address를 소문자로 정규화 — EVM 주소는 대소문자 무관하나 일관성을 위해
    const walletAddress = (siweMessageData.address ?? payload.address).toLowerCase();

    const user = await this.prisma.user.upsert({
      where: { world_id: walletAddress },
      update: {},
      create: {
        world_id: walletAddress,
        nickname: `User-${randomUUID().slice(0, 8)}`,
      },
    });

    const payload_ = { sub: user.id, world_id: user.world_id };
    const access_token = await this.jwtService.signAsync(payload_);

    return { access_token };
  }

  /**
   * 개발 환경 전용 로그인. World ID 검증 없이 즉시 JWT를 발급한다.
   * worldId 미제공 시 'dev-{uuid}' 형식으로 자동 생성.
   */
  async devLogin(worldId?: string): Promise<{ access_token: string }> {
    const resolvedWorldId = worldId ?? `dev-${randomUUID()}`;

    const existingIdentity = await this.prisma.userIdentity.findUnique({
      where: {
        provider_provider_user_id: {
          provider: 'dev',
          provider_user_id: resolvedWorldId,
        },
      },
      include: { user: true },
    });

    const user = existingIdentity?.user ?? await this.prisma.user.create({
      data: {
        world_id: resolvedWorldId,
        nickname: `User-${randomUUID().slice(0, 8)}`,
        identities: {
          create: {
            provider: 'dev',
            provider_user_id: resolvedWorldId,
            email: null,
            email_verified: false,
            display_name: null,
          },
        },
      },
    });

    const access_token = await this.signUserToken(user.id, {
      provider: 'dev',
      providerUserId: resolvedWorldId,
    });

    return { access_token };
  }

  async socialLogin(input: ISocialLogin): Promise<{ access_token: string }> {
    const verified = await this.socialAuthVerifier.verify(input);
    if (verified.provider !== input.provider) {
      throw new BadRequestException('Social auth provider mismatch');
    }

    const existingIdentity = await this.prisma.userIdentity.findUnique({
      where: {
        provider_provider_user_id: {
          provider: verified.provider,
          provider_user_id: verified.providerUserId,
        },
      },
      include: { user: true },
    });

    const user = existingIdentity?.user ?? await this.prisma.user.create({
      data: {
        world_id: null,
        nickname: this.nicknameFromIdentity(verified),
        identities: {
          create: {
            provider: verified.provider,
            provider_user_id: verified.providerUserId,
            email: verified.email,
            email_verified: verified.emailVerified,
            display_name: verified.displayName,
          },
        },
      },
      include: { identities: true },
    });

    const access_token = await this.signUserToken(user.id, {
      provider: verified.provider,
      providerUserId: verified.providerUserId,
    });

    return { access_token };
  }

  /** 유저 ID로 유저 정보를 조회한다. GET /auth/me에서 사용. */
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { identities: true },
    });
    if (!user) return null;
    return {
      ...user,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
      identities: user.identities.map((identity) => ({
        ...identity,
        created_at: identity.created_at.toISOString(),
        updated_at: identity.updated_at.toISOString(),
      })),
    };
  }

  private async signUserToken(
    userId: string,
    identity: { provider: string; providerUserId: string },
  ) {
    return this.jwtService.signAsync({
      sub: userId,
      provider: identity.provider,
      provider_user_id: identity.providerUserId,
    });
  }

  private nicknameFromIdentity(identity: VerifiedSocialIdentity) {
    if (identity.displayName) return identity.displayName;
    if (identity.email) return identity.email.split('@')[0];
    return `User-${randomUUID().slice(0, 8)}`;
  }

  // ─────────────────────────────────────────────────────────
  // TODO: verifyWorldId(proof)
  // IDKit (네이티브 앱용) World ID proof 검증 메서드.
  // - Developer Portal API (POST https://developer.world.org/api/v4/verify/{rp_id})로 검증
  // - nullifier를 유저 식별자로 사용 (wallet address와 별도)
  // - 네이티브 앱 버전 개발 시 구현 예정
  // @see https://docs.world.org/world-id/idkit/integrate
  // ─────────────────────────────────────────────────────────
}
