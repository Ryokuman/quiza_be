import { Controller, Req } from '@nestjs/common';
import { TypedRoute } from '@nestia/core';
import { AdviceService } from './advice.service';
import type { IAdviceResult } from './dto/advice.dto';
import type { AuthenticatedRequest } from '../auth/types';

@Controller('advice')
export class AdviceController {
  constructor(private readonly adviceService: AdviceService) {}

  /**
   * 유저의 약점 데이터 기반 개인화 학습 조언을 생성한다.
   *
   * UserQuestionStats에서 정답률이 낮은 태그를 분석하여
   * Gemini로 맞춤형 학습 조언을 생성한다.
   *
   * @tag Advice
   */
  @TypedRoute.Get()
  async getAdvice(@Req() req: AuthenticatedRequest): Promise<IAdviceResult> {
    return this.adviceService.generateAdvice(req.user.userId);
  }
}
