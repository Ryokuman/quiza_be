import { Controller, Req, UseGuards } from '@nestjs/common';
import { TypedRoute, TypedBody } from '@nestia/core';
import { AnswersService } from './answers.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { ISubmitAnswer, IAnswerResult } from './dto/answer.dto.js';
import type { AuthenticatedRequest } from '../auth/types.js';

@Controller('answers')
export class AnswersController {
  constructor(private readonly answersService: AnswersService) {}

  /**
   * 답안을 제출하고 채점 결과를 받는다.
   *
   * 문제의 정답과 비교하여 채점 후 결과를 반환한다.
   * 동시에 UserAnswer 레코드를 저장하고,
   * HLR 반감기(UserQuestionStats)를 갱신한다.
   *
   * HLR 규칙:
   * - 정답 → half_life × 2 (복습 간격 증가)
   * - 오답 → half_life × 0.5 (복습 간격 감소)
   *
   * @param body question_id + user_answer
   * @tag Answers
   */
  @TypedRoute.Post()
  @UseGuards(JwtAuthGuard)
  async submit(
    @Req() req: AuthenticatedRequest,
    @TypedBody() body: ISubmitAnswer,
  ): Promise<IAnswerResult> {
    return this.answersService.submit(
      req.user.userId,
      body.question_id,
      body.user_answer,
    );
  }
}
