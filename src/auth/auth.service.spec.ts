import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

vi.mock('@worldcoin/minikit-js/siwe', () => ({
  verifySiweMessage: vi.fn(),
}));

import { verifySiweMessage } from '@worldcoin/minikit-js/siwe';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockedVerifySiwe = vi.mocked(verifySiweMessage);

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { upsert: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> } };
  let jwtService: { signAsync: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = {
      user: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
      },
    };
    jwtService = {
      signAsync: vi.fn().mockResolvedValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: vi.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Nonce ──────────────────────────────────────────────

  describe('generateNonce', () => {
    it('32자 hex 문자열을 반환한다', () => {
      const nonce = service.generateNonce();
      expect(nonce).toMatch(/^[0-9a-f]{32}$/);
    });

    it('매번 다른 nonce를 생성한다', () => {
      const a = service.generateNonce();
      const b = service.generateNonce();
      expect(a).not.toBe(b);
    });
  });

  describe('validateNonce', () => {
    it('유효한 nonce는 true를 반환한다', () => {
      const nonce = service.generateNonce();
      expect(service.validateNonce(nonce)).toBe(true);
    });

    it('사용된 nonce는 재사용 불가 (1회용)', () => {
      const nonce = service.generateNonce();
      service.validateNonce(nonce);
      expect(service.validateNonce(nonce)).toBe(false);
    });

    it('존재하지 않는 nonce는 false를 반환한다', () => {
      expect(service.validateNonce('nonexistent')).toBe(false);
    });

    it('만료된 nonce는 false를 반환한다', () => {
      const nonce = service.generateNonce();
      vi.useFakeTimers();
      vi.advanceTimersByTime(11 * 60 * 1000);
      expect(service.validateNonce(nonce)).toBe(false);
      vi.useRealTimers();
    });
  });

  // ── devLogin ───────────────────────────────────────────

  describe('devLogin', () => {
    const mockUser = { id: 'user-uuid', world_id: 'dev-test', nickname: 'User-abc' };

    beforeEach(() => {
      prisma.user.upsert.mockResolvedValue(mockUser);
    });

    it('worldId 제공 시 해당 값으로 유저를 upsert한다', async () => {
      const result = await service.devLogin('dev-test');

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { world_id: 'dev-test' },
        }),
      );
      expect(result).toEqual({ access_token: 'mock-jwt-token' });
    });

    it('worldId 미제공 시 dev-{uuid} 형식으로 자동 생성한다', async () => {
      await service.devLogin();

      const call = prisma.user.upsert.mock.calls[0][0];
      expect(call.where.world_id).toMatch(/^dev-/);
      expect(call.create.world_id).toMatch(/^dev-/);
    });

    it('JWT payload에 sub과 world_id를 포함한다', async () => {
      await service.devLogin('dev-test');

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-uuid',
        world_id: 'dev-test',
      });
    });
  });

  // ── verifySiweAuth ─────────────────────────────────────

  describe('verifySiweAuth', () => {
    const payload = {
      message: 'siwe-message',
      signature: '0xsig',
      address: '0xAbCdEf1234567890',
    };

    it('유효한 서명이면 JWT를 반환하고 유저를 upsert한다', async () => {
      const nonce = service.generateNonce();
      mockedVerifySiwe.mockResolvedValue({
        isValid: true,
        siweMessageData: { address: '0xAbCdEf1234567890' },
      } as any);
      prisma.user.upsert.mockResolvedValue({
        id: 'user-uuid',
        world_id: '0xabcdef1234567890',
        nickname: 'User-abc',
      });

      const result = await service.verifySiweAuth(payload, nonce);

      expect(result).toEqual({ access_token: 'mock-jwt-token' });
      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { world_id: '0xabcdef1234567890' },
        }),
      );
    });

    it('무효한 nonce면 BadRequestException을 던진다', async () => {
      await expect(service.verifySiweAuth(payload, 'bad-nonce')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('무효한 서명이면 BadRequestException을 던진다', async () => {
      const nonce = service.generateNonce();
      mockedVerifySiwe.mockResolvedValue({
        isValid: false,
        siweMessageData: {},
      } as any);

      await expect(service.verifySiweAuth(payload, nonce)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('wallet address를 소문자로 정규화한다', async () => {
      const nonce = service.generateNonce();
      mockedVerifySiwe.mockResolvedValue({
        isValid: true,
        siweMessageData: { address: '0xABCDEF' },
      } as any);
      prisma.user.upsert.mockResolvedValue({
        id: 'user-uuid',
        world_id: '0xabcdef',
        nickname: 'User-abc',
      });

      await service.verifySiweAuth(payload, nonce);

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { world_id: '0xabcdef' },
        }),
      );
    });
  });

  // ── getUserById ────────────────────────────────────────

  describe('getUserById', () => {
    it('유저 ID로 조회한다', async () => {
      const mockUser = { id: 'user-uuid', world_id: 'test', nickname: 'User-abc' };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserById('user-uuid');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-uuid' } });
      expect(result).toEqual(mockUser);
    });
  });
});
