import { Controller, Req } from '@nestjs/common';
import { TypedRoute, TypedParam, TypedBody } from '@nestia/core';
import { GoalService } from './goal.service.js';
import type { ICreateGoalBody, ICreateGoalResult, IGoalItem } from './dto/create-goal.dto.js';
import type { AuthenticatedRequest } from '../auth/types.js';

@Controller('goals')
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  /**
   * 새 학습 목표 생성. 도메인이 없으면 자동 생성.
   * embedding 제공 시 유사 템플릿 로드맵 자동 매칭.
   * @tag Goal
   */
  @TypedRoute.Post()
  async createGoal(
    @TypedBody() body: ICreateGoalBody,
    @Req() req: AuthenticatedRequest,
  ): Promise<ICreateGoalResult> {
    return this.goalService.createGoal(req.user.userId, body);
  }

  /**
   * 현재 유저의 활성 목표 목록 조회.
   * @tag Goal
   */
  @TypedRoute.Get()
  async getUserGoals(@Req() req: AuthenticatedRequest): Promise<IGoalItem[]> {
    return this.goalService.getUserGoals(req.user.userId);
  }

  /**
   * 목표 비활성화.
   * @tag Goal
   */
  @TypedRoute.Patch(':goalId/deactivate')
  async deactivateGoal(
    @TypedParam('goalId') goalId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    await this.goalService.deactivateGoal(req.user.userId, goalId);
    return { success: true };
  }
}
