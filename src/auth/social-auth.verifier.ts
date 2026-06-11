import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SocialAuthProvider } from './dto/social-login.dto';

export interface VerifiedSocialIdentity {
  provider: SocialAuthProvider;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
}

type JsonRecord = Record<string, unknown>;

@Injectable()
export class SocialAuthVerifier {
  constructor(private readonly configService: ConfigService) {}

  async verify(input: {
    provider: SocialAuthProvider;
    token: string;
  }): Promise<VerifiedSocialIdentity> {
    switch (input.provider) {
      case 'google':
        return this.verifyGoogle(input.token);
      case 'apple':
        return this.verifyApple(input.token);
      case 'kakao':
        return this.verifyKakao(input.token);
      default:
        throw new BadRequestException('Unsupported social auth provider');
    }
  }

  private async verifyGoogle(token: string): Promise<VerifiedSocialIdentity> {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
    );
    if (!response.ok) {
      throw new BadRequestException('Invalid Google token');
    }

    const body = await response.json() as JsonRecord;
    const configuredClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (configuredClientId && body.aud !== configuredClientId) {
      throw new BadRequestException('Invalid Google token audience');
    }

    const sub = this.readString(body, 'sub');
    if (!sub) {
      throw new BadRequestException('Invalid Google token subject');
    }

    return {
      provider: 'google',
      providerUserId: sub,
      email: this.readString(body, 'email'),
      emailVerified: body.email_verified === 'true' || body.email_verified === true,
      displayName: this.readString(body, 'name'),
    };
  }

  private async verifyApple(token: string): Promise<VerifiedSocialIdentity> {
    const { createRemoteJWKSet, jwtVerify } = await import('jose');
    const jwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
    const configuredClientId = this.configService.get<string>('APPLE_CLIENT_ID');

    const { payload } = await jwtVerify(token, jwks, {
      issuer: 'https://appleid.apple.com',
      audience: configuredClientId || undefined,
    }).catch(() => {
      throw new BadRequestException('Invalid Apple token');
    });

    if (!payload.sub) {
      throw new BadRequestException('Invalid Apple token subject');
    }

    return {
      provider: 'apple',
      providerUserId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
      displayName: null,
    };
  }

  private async verifyKakao(token: string): Promise<VerifiedSocialIdentity> {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new BadRequestException('Invalid Kakao token');
    }

    const body = await response.json() as JsonRecord;
    const id = typeof body.id === 'number' || typeof body.id === 'string'
      ? String(body.id)
      : null;
    if (!id) {
      throw new BadRequestException('Invalid Kakao token subject');
    }

    const kakaoAccount = this.readRecord(body, 'kakao_account');
    const profile = kakaoAccount ? this.readRecord(kakaoAccount, 'profile') : null;

    return {
      provider: 'kakao',
      providerUserId: id,
      email: kakaoAccount ? this.readString(kakaoAccount, 'email') : null,
      emailVerified: kakaoAccount?.is_email_verified === true,
      displayName: profile ? this.readString(profile, 'nickname') : null,
    };
  }

  private readString(source: JsonRecord, key: string) {
    const value = source[key];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private readRecord(source: JsonRecord, key: string) {
    const value = source[key];
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as JsonRecord
      : null;
  }
}
