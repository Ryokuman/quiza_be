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
import { WorldIdProofDto } from './dto/index.js';
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

  private setTokenCookie(res: Response, token: string) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  @Post('verify')
  async verify(@Body() body: WorldIdProofDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verifyWorldId(body);
    this.setTokenCookie(res, result.access_token);
    return { success: true };
  }

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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: AuthenticatedRequest) {
    return this.authService.getUserById(req.user.userId);
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    return { success: true };
  }
}
