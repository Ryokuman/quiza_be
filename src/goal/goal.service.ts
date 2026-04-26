import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DomainService } from '../domain/domain.service';

@Injectable()
export class GoalService {
  private readonly logger = new Logger(GoalService.name);

  constructor(
    private readonly prisma: PrismaService,
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

    // 선택된 태그로 로드맵 + 체크포인트 자동 생성
    let hasRoadmap = false;
    if (input.tagIds && input.tagIds.length > 0) {
      const tags = await this.prisma.tag.findMany({
        where: { id: { in: input.tagIds } },
        orderBy: { name: 'asc' },
      });

      if (tags.length > 0) {
        await this.prisma.roadmap.create({
          data: {
            goal_id: goal.id,
            title: `${domain.name} - ${input.target}`,
            is_template: false,
            checkpoints: {
              create: tags.map((tag, idx) => ({
                title: tag.name,
                description: `${tag.name} 학습`,
                tag_id: tag.id,
                difficulty: Math.min(idx + 1, 5),
                order: idx + 1,
                status: idx === 0 ? 'in_progress' : 'not_started',
                best_score: null,
                attempts: 0,
              })),
            },
          },
        });
        hasRoadmap = true;
      }
    }

    return {
      goal: {
        id: goal.id,
        domain: { id: goal.domain.id, name: goal.domain.name },
        target: goal.target,
        level: goal.level,
        is_active: goal.is_active,
        created_at: goal.created_at.toISOString(),
        hasRoadmap,
      },
      templateMatched: false,
    };
  }

  async getUserGoals(userId: string) {
    const goals = await this.prisma.userGoal.findMany({
      where: { user_id: userId, is_active: true },
      include: { domain: true, roadmap: true },
      orderBy: { created_at: 'desc' },
      take: 50,
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
    this.logger.log(`목표 비활성화: userId=${userId}, goalId=${goalId}`);
    const result = await this.prisma.userGoal.updateMany({
      where: { id: goalId, user_id: userId },
      data: { is_active: false },
    });
    this.logger.log(`비활성화 결과: ${result.count}건 업데이트`);
  }
}
