import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { SocialAuthVerifier, type VerifiedSocialIdentity } from './social-auth.verifier';
import type { ISocialLogin } from './dto/social-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly socialAuthVerifier: SocialAuthVerifier,
  ) {}

  /**
   * 개발 환경 전용 로그인.
   * id 미제공 시 'dev-{uuid}' 형식으로 자동 생성.
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

}
