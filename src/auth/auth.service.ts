import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service.js';
import { WorldIdProofDto } from './dto/index.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Verify a World ID proof and issue a JWT.
   * Currently stubs the MiniKit verification (validates required fields only).
   */
  async verifyWorldId(
    proof: WorldIdProofDto,
  ): Promise<{ access_token: string }> {
    // Stub: validate that the proof has all required fields
    if (
      !proof.merkle_root ||
      !proof.nullifier_hash ||
      !proof.proof ||
      !proof.verification_level ||
      !proof.action
    ) {
      throw new BadRequestException('Invalid World ID proof: missing fields');
    }

    // TODO: Replace with actual MiniKit / World ID verification
    // const verifyRes = await verifyCloudProof(proof, app_id, action);

    // Use nullifier_hash as the unique world_id identifier
    const worldId = proof.nullifier_hash;

    const user = await this.prisma.user.upsert({
      where: { world_id: worldId },
      update: {},
      create: {
        world_id: worldId,
        nickname: `User-${uuidv4().slice(0, 8)}`,
      },
    });

    const payload = { sub: user.id, world_id: user.world_id };
    const access_token = await this.jwtService.signAsync(payload);

    return { access_token };
  }

  /**
   * Dev-only login that bypasses World ID verification.
   * Generates a random world_id if none is provided.
   */
  async devLogin(worldId?: string): Promise<{ access_token: string }> {
    const resolvedWorldId = worldId ?? `dev-${uuidv4()}`;

    const user = await this.prisma.user.upsert({
      where: { world_id: resolvedWorldId },
      update: {},
      create: {
        world_id: resolvedWorldId,
        nickname: `User-${uuidv4().slice(0, 8)}`,
      },
    });

    const payload = { sub: user.id, world_id: user.world_id };
    const access_token = await this.jwtService.signAsync(payload);

    return { access_token };
  }

  /**
   * Retrieve user info by ID (for /auth/me).
   */
  async getUserById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}
