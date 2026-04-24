import { Controller, Req, UseGuards } from '@nestjs/common';
import { TypedRoute, TypedBody, TypedParam } from '@nestia/core';
import { RoadmapsService } from './roadmaps.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { ICreateRoadmap, IRoadmap, IRoadmapProgress } from './dto/roadmap.dto.js';
import type { tags } from 'typia';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { userId: string; worldId: string };
}

@Controller('roadmaps')
export class RoadmapsController {
  constructor(private readonly roadmapsService: RoadmapsService) {}

  /**
   * 로드맵을 생성한다.
   *
   * UserGoal을 기반으로 체크포인트가 포함된 로드맵을 생성한다.
   * 같은 도메인+목적의 기존 템플릿이 있으면 복사하고 (AI 호출 0),
   * 없으면 새로 생성한다 (추후 Gemini API 연동).
   *
   * 첫 번째로 생성된 로드맵은 is_template=true로 저장되어
   * 동일 목적의 다른 유저가 재활용할 수 있다.
   *
   * @param body goal_id
   * @tag Roadmaps
   */
  @TypedRoute.Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Req() req: AuthenticatedRequest,
    @TypedBody() body: ICreateRoadmap,
  ): Promise<IRoadmap> {
    return this.roadmapsService.create(req.user.userId, body.goal_id) as any;
  }

  /**
   * 로드맵을 조회한다.
   *
   * 체크포인트 목록을 order 순으로 포함하여 반환한다.
   * 각 체크포인트의 status, best_score, attempts로 진행 상태를 확인할 수 있다.
   *
   * @param id 로드맵 ID
   * @tag Roadmaps
   */
  @TypedRoute.Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @TypedParam('id') id: string & tags.Format<'uuid'>,
  ): Promise<IRoadmap> {
    return this.roadmapsService.findOne(id) as any;
  }

  /**
   * 로드맵 진행률을 조회한다.
   *
   * passed 상태인 체크포인트 수와 전체 체크포인트 수,
   * 그리고 진행률(%)을 반환한다.
   *
   * @param id 로드맵 ID
   * @tag Roadmaps
   */
  @TypedRoute.Get(':id/progress')
  @UseGuards(JwtAuthGuard)
  async getProgress(
    @TypedParam('id') id: string & tags.Format<'uuid'>,
  ): Promise<IRoadmapProgress> {
    return this.roadmapsService.getProgress(id);
  }
}
