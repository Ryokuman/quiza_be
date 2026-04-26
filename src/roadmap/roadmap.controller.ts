import { Controller, Req, NotFoundException } from '@nestjs/common';
import { TypedRoute, TypedParam, TypedBody } from '@nestia/core';
import { RoadmapService } from './roadmap.service';
import { PrismaService } from '../prisma/prisma.service';
import type { IMatchTemplateBody, IMatchTemplateResult } from './dto/match-template.dto';
import type { IDomainRoadmap } from '../domain/dto/domain-response.dto';
import type { AuthenticatedRequest } from '../auth/types';

@Controller('roadmaps')
export class RoadmapController {
  constructor(
    private readonly roadmapService: RoadmapService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Goal ID로 로드맵 조회 (체크포인트 포함).
   * 본인의 goal에 대한 로드맵만 조회 가능.
   * @tag Roadmap
   */
  @TypedRoute.Get(':goalId')
  async getByGoalId(
    @Req() req: AuthenticatedRequest,
    @TypedParam('goalId') goalId: string,
  ): Promise<IDomainRoadmap | null> {
    // 소유권 검증
    const goal = await this.prisma.userGoal.findFirst({
      where: { id: goalId, user_id: req.user.userId },
    });
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    return this.roadmapService.getByGoalId(goalId);
  }

  /**
   * 임베딩 기반 유사 템플릿 로드맵 검색.
   * @tag Roadmap
   */
  @TypedRoute.Post('match')
  async matchTemplate(@TypedBody() body: IMatchTemplateBody): Promise<IMatchTemplateResult> {
    const result = await this.roadmapService.findSimilarTemplate(body.embedding);
    if (!result) {
      return { matched: false, roadmapId: null, similarity: null };
    }
    return {
      matched: true,
      roadmapId: result.roadmapId,
      similarity: result.similarity,
    };
  }
}
