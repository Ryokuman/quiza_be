import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { WalletAuthDto } from './dto/index.js';
import { DevLoginDto } from './dto/dev-login.dto.js';
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
   * GET /auth/nonce
   * SIWE 인증을 위한 일회용 nonce 발급.
   * 프론트엔드가 MiniKit.walletAuth() 호출 전에 이 엔드포인트로 nonce를 받아간다.
   * nonce는 10분 TTL, 1회용 (사용 후 즉시 폐기).
   */
  @Get('nonce')
  getNonce() {
    return { nonce: this.authService.generateNonce() };
  }

  /**
   * POST /auth/wallet
   * MiniKit walletAuth() 결과(SIWE 서명)를 검증하고 JWT를 발급한다.
   *
   * 인증 플로우:
   * 1. 프론트엔드 → GET /auth/nonce → nonce 획득
   * 2. 프론트엔드 → MiniKit.walletAuth({ nonce }) → SIWE 서명 획득
   * 3. 프론트엔드 → POST /auth/wallet { message, signature, address, nonce }
   * 4. 백엔드 → SIWE 검증 → 유저 upsert → JWT 발급 → 쿠키 세팅
   *
   * Mini App (World App webview) 전용. 네이티브 앱은 IDKit을 사용한다.
   * @see TODO: POST /auth/verify-worldid (IDKit 네이티브 앱용 — 미구현)
   */
  @Post('wallet')
  async walletAuth(@Body() body: WalletAuthDto, @Res({ passthrough: true }) res: Response) {
    const { nonce, ...payload } = body;
    const result = await this.authService.verifySiweAuth(payload, nonce);
    this.setTokenCookie(res, result.access_token);
    return { success: true };
  }

  /**
   * POST /auth/dev-login
   * 개발 환경 전용 로그인. 프로덕션에서는 비활성화됨.
   * World ID 검증 없이 즉시 JWT를 발급한다.
   */
  @Post('dev-login')
  async devLogin(@Body() body: DevLoginDto, @Res({ passthrough: true }) res: Response) {
    const enableDevLogin = this.configService.get('ENABLE_DEV_LOGIN') === 'true'
      || this.configService.get('NODE_ENV') !== 'production';
    if (!enableDevLogin) {
      throw new ForbiddenException('Dev login is not available in production');
    }
    const result = await this.authService.devLogin(body.world_id);
    this.setTokenCookie(res, result.access_token);
    return { success: true };
  }

  /** GET /auth/me — JWT 기반 현재 유저 정보 조회 */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: AuthenticatedRequest) {
    return this.authService.getUserById(req.user.userId);
  }

  /** POST /auth/logout — 인증 쿠키 삭제 */
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────
  // TODO: POST /auth/verify-worldid
  // IDKit (네이티브 앱용) World ID 검증 엔드포인트.
  // - IDKit Swift/Kotlin SDK에서 받은 proof를 Developer Portal API로 검증
  // - nullifier를 유저 식별자로 저장
  // - 네이티브 앱 버전 개발 시 구현 예정
  // @see https://docs.world.org/world-id/idkit/integrate
  // ─────────────────────────────────────────────────────────
}
