import {
  Controller,
  ForbiddenException,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { TypedRoute, TypedBody } from '@nestia/core';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { IWalletAuth } from './dto/wallet-auth.dto.js';
import type { IDevLogin } from './dto/dev-login.dto.js';
import type { IAuthResponse, INonceResponse } from './dto/auth-response.dto.js';
import { Request } from 'express';
import type { Response } from 'express';

interface AuthenticatedRequest extends Request {
  user: { userId: string; worldId: string };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /** JWT를 httpOnly 쿠키에 세팅하는 공통 헬퍼 */
  private setTokenCookie(res: Response, token: string) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
      path: '/',
    });
  }

  /**
   * SIWE 인증을 위한 일회용 nonce 발급.
   *
   * 프론트엔드가 MiniKit.walletAuth() 호출 전에 이 엔드포인트로 nonce를 받아간다.
   * nonce는 10분 TTL, 1회용 (사용 후 즉시 폐기).
   *
   * @tag Auth
   */
  @TypedRoute.Get('nonce')
  getNonce(): INonceResponse {
    return { nonce: this.authService.generateNonce() };
  }

  /**
   * MiniKit walletAuth() 결과(SIWE 서명)를 검증하고 JWT를 발급한다.
   *
   * 인증 플로우:
   * 1. 프론트엔드 → GET /auth/nonce → nonce 획득
   * 2. 프론트엔드 → MiniKit.walletAuth({ nonce }) → SIWE 서명 획득
   * 3. 프론트엔드 → POST /auth/wallet { message, signature, address, nonce }
   * 4. 백엔드 → SIWE 검증 → 유저 upsert → JWT 발급 → 쿠키 세팅
   *
   * Mini App (World App webview) 전용. 네이티브 앱은 IDKit을 사용한다.
   *
   * @param body SIWE 서명 페이로드
   * @tag Auth
   */
  @TypedRoute.Post('wallet')
  async walletAuth(
    @TypedBody() body: IWalletAuth,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IAuthResponse> {
    const { nonce, ...payload } = body;
    const result = await this.authService.verifySiweAuth(payload, nonce);
    this.setTokenCookie(res, result.access_token);
    return { success: true };
  }

  /**
   * 개발 환경 전용 로그인.
   *
   * 프로덕션에서는 비활성화됨 (ENABLE_DEV_LOGIN=true로 강제 활성화 가능).
   * World ID 검증 없이 즉시 JWT를 발급한다.
   *
   * @param body 테스트용 world_id (선택)
   * @tag Auth
   */
  @TypedRoute.Post('dev-login')
  async devLogin(
    @TypedBody() body: IDevLogin,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IAuthResponse> {
    const enableDevLogin = this.configService.get('ENABLE_DEV_LOGIN') === 'true'
      || this.configService.get('NODE_ENV') !== 'production';
    if (!enableDevLogin) {
      throw new ForbiddenException('Dev login is not available in production');
    }
    const result = await this.authService.devLogin(body.world_id);
    this.setTokenCookie(res, result.access_token);
    return { success: true };
  }

  /**
   * JWT 기반 현재 유저 정보 조회.
   *
   * httpOnly 쿠키 또는 Authorization Bearer 헤더에서 JWT를 추출하여
   * 해당 유저의 정보를 반환한다.
   *
   * 응답 예시:
   * ```json
   * {
   *   "id": "550e8400-e29b-41d4-a716-446655440000",
   *   "world_id": "0xabcdef1234567890",
   *   "nickname": "User-a1b2c3d4",
   *   "created_at": "2026-04-24T00:00:00.000Z",
   *   "updated_at": "2026-04-24T00:00:00.000Z"
   * }
   * ```
   *
   * @returns 인증된 유저의 프로필 정보. 유저가 없으면 null.
   * @tag Auth
   */
  @TypedRoute.Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthenticatedRequest) {
    return this.authService.getUserById(req.user.userId);
  }

  /**
   * 로그아웃 — 인증 쿠키를 삭제한다.
   *
   * 서버 측 세션은 없으므로 쿠키 삭제만으로 로그아웃이 완료된다.
   * JWT 자체는 만료 전까지 유효하지만, httpOnly 쿠키가 삭제되면
   * 브라우저가 더 이상 토큰을 전송하지 않는다.
   *
   * @tag Auth
   */
  @TypedRoute.Post('logout')
  async logout(@Res({ passthrough: true }) res: Response): Promise<IAuthResponse> {
    res.clearCookie('access_token', { path: '/' });
    return { success: true };
  }
}
