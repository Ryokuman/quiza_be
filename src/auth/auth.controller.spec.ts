import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

// PrismaService → generated/prisma/client의 import.meta.url 문제 우회
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));
jest.mock('@worldcoin/minikit-js/siwe', () => ({
  verifySiweMessage: jest.fn(),
}));

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    generateNonce: jest.Mock;
    verifySiweAuth: jest.Mock;
    devLogin: jest.Mock;
    getUserById: jest.Mock;
  };
  let configService: { get: jest.Mock };
  let mockRes: Partial<Response>;

  beforeEach(async () => {
    authService = {
      generateNonce: jest.fn().mockReturnValue('test-nonce-abc123'),
      verifySiweAuth: jest.fn().mockResolvedValue({ access_token: 'jwt-token' }),
      devLogin: jest.fn().mockResolvedValue({ access_token: 'jwt-token' }),
      getUserById: jest.fn(),
    };
    configService = {
      get: jest.fn(),
    };
    mockRes = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  // ── GET /auth/nonce ────────────────────────────────────

  describe('getNonce', () => {
    it('nonce 객체를 반환한다', () => {
      const result = controller.getNonce();
      expect(result).toEqual({ nonce: 'test-nonce-abc123' });
      expect(authService.generateNonce).toHaveBeenCalled();
    });
  });

  // ── POST /auth/wallet ─────────────────────────────────

  describe('walletAuth', () => {
    const body = {
      message: 'siwe-msg',
      signature: '0xsig',
      address: '0xaddr',
      nonce: 'test-nonce',
    };

    it('SIWE 검증 성공 시 쿠키를 세팅하고 success를 반환한다', async () => {
      const result = await controller.walletAuth(body, mockRes as Response);

      expect(authService.verifySiweAuth).toHaveBeenCalledWith(
        { message: 'siwe-msg', signature: '0xsig', address: '0xaddr' },
        'test-nonce',
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'access_token',
        'jwt-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ success: true });
    });
  });

  // ── POST /auth/dev-login ──────────────────────────────

  describe('devLogin', () => {
    it('개발 환경에서 로그인 성공', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });

      const result = await controller.devLogin({ world_id: 'dev-test' }, mockRes as Response);

      expect(authService.devLogin).toHaveBeenCalledWith('dev-test');
      expect(mockRes.cookie).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('프로덕션 환경에서 ENABLE_DEV_LOGIN 없으면 403', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'ENABLE_DEV_LOGIN') return undefined;
        return undefined;
      });

      await expect(
        controller.devLogin({}, mockRes as Response),
      ).rejects.toThrow(ForbiddenException);
    });

    it('프로덕션이어도 ENABLE_DEV_LOGIN=true면 허용', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'ENABLE_DEV_LOGIN') return 'true';
        return undefined;
      });

      const result = await controller.devLogin({}, mockRes as Response);
      expect(result).toEqual({ success: true });
    });
  });

  // ── GET /auth/me ──────────────────────────────────────

  describe('me', () => {
    it('인증된 유저 정보를 반환한다', async () => {
      const mockUser = { id: 'user-uuid', world_id: 'test', nickname: 'User-abc' };
      authService.getUserById.mockResolvedValue(mockUser);

      const req = { user: { userId: 'user-uuid', worldId: 'test' } } as any;
      const result = await controller.me(req);

      expect(authService.getUserById).toHaveBeenCalledWith('user-uuid');
      expect(result).toEqual(mockUser);
    });
  });

  // ── POST /auth/logout ─────────────────────────────────

  describe('logout', () => {
    it('쿠키를 클리어하고 success를 반환한다', async () => {
      const result = await controller.logout(mockRes as Response);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('access_token', { path: '/' });
      expect(result).toEqual({ success: true });
    });
  });
});
