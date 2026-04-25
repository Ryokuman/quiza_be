import { Controller, Req } from '@nestjs/common';
import { TypedRoute } from '@nestia/core';
import { StatsService } from './stats.service.js';
import type { IStats } from './dto/stats.dto.js';
import type { AuthenticatedRequest } from '../auth/types.js';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /**
   * 유저의 종합 학습 통계를 조회한다.
   *
   * 태그별 정답률, 총 답변 수, 로드맵 진행률을 반환한다.
   * 로드맵 진행률은 유저의 모든 로드맵에 대한 종합 진행률이다.
   *
   * @tag Stats
   */
  @TypedRoute.Get()
  async getStats(@Req() req: AuthenticatedRequest): Promise<IStats> {
    return this.statsService.getStats(req.user.userId);
  }
}
