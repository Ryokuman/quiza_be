import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ICreateGoal } from './dto/goal.dto.js';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  /** UserGoal을 생성한다. domain_id 유효성을 확인. */
  async create(userId: string, input: ICreateGoal) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: input.domain_id },
    });
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return this.prisma.userGoal.create({
      data: {
        user_id: userId,
        domain_id: input.domain_id,
        target: input.target,
        level: input.level,
      },
    });
  }
}
