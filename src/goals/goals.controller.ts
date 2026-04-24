import { Controller, Req, UseGuards } from '@nestjs/common';
import { TypedRoute, TypedBody } from '@nestia/core';
import { GoalsService } from './goals.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { ICreateGoal, IGoal } from './dto/goal.dto.js';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { userId: string; worldId: string };
}

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  /**
   * 학습 목적(UserGoal)을 생성한다.
   *
   * 온보딩 과정에서 유저가 도메인을 선택하고
   * 학습 목표(target)와 수준(level)을 입력하면 UserGoal이 생성된다.
   * 이후 POST /roadmaps로 로드맵을 생성할 수 있다.
   *
   * @param body 도메인 ID + 학습 목표 + 수준
   * @tag Goals
   */
  @TypedRoute.Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Req() req: AuthenticatedRequest,
    @TypedBody() body: ICreateGoal,
  ): Promise<IGoal> {
    return this.goalsService.create(req.user.userId, body) as any;
  }
}
