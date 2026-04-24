import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RoadmapService } from '../roadmap/roadmap.service.js';
import { DomainService } from '../domain/domain.service.js';

@Injectable()
export class GoalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roadmapService: RoadmapService,
    private readonly domainService: DomainService,
  ) {}

  async createGoal(
    userId: string,
    input: { domain: string; target: string; level: string; tagIds?: string[] },
  ) {
    // Use DomainService to find or create domain (auto-generates embedding)
    const domain = await this.domainService.findOrCreate(input.domain);

    // Check duplicate active goal
    const existing = await this.prisma.userGoal.findFirst({
      where: { user_id: userId, domain_id: domain.id, is_active: true },
    });
    if (existing) {
      throw new ConflictException('이미 해당 도메인에 활성 목표가 있습니다');
    }

    // Create goal
    const goal = await this.prisma.userGoal.create({
      data: {
        user_id: userId,
        domain_id: domain.id,
        target: input.target,
        level: input.level,
      },
      include: { domain: true },
    });

    // Template matching removed — roadmap will be generated from selected tags

    return {
      goal: {
        id: goal.id,
        domain: { id: goal.domain.id, name: goal.domain.name },
        target: goal.target,
        level: goal.level,
        is_active: goal.is_active,
        created_at: goal.created_at.toISOString(),
        hasRoadmap: false,
      },
      templateMatched: false,
    };
  }

  async getUserGoals(userId: string) {
    const goals = await this.prisma.userGoal.findMany({
      where: { user_id: userId, is_active: true },
      include: { domain: true, roadmap: true },
      orderBy: { created_at: 'desc' },
    });

    return goals.map((g) => ({
      id: g.id,
      domain: { id: g.domain.id, name: g.domain.name },
      target: g.target,
      level: g.level,
      is_active: g.is_active,
      created_at: g.created_at.toISOString(),
      hasRoadmap: !!g.roadmap,
    }));
  }

  async deactivateGoal(userId: string, goalId: string) {
    await this.prisma.userGoal.updateMany({
      where: { id: goalId, user_id: userId },
      data: { is_active: false },
    });
  }
}
