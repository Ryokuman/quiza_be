import { Controller } from '@nestjs/common';
import { TypedRoute, TypedParam, TypedBody } from '@nestia/core';
import { RoadmapService } from './roadmap.service.js';
import type { IMatchTemplateBody, IMatchTemplateResult } from './dto/match-template.dto.js';

@Controller('roadmaps')
export class RoadmapController {
  constructor(private readonly roadmapService: RoadmapService) {}

  /**
   * Goal ID로 로드맵 조회 (체크포인트 포함).
   * @tag Roadmap
   */
  @TypedRoute.Get(':goalId')
  async getByGoalId(@TypedParam('goalId') goalId: string) {
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
