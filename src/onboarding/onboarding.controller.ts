import { Controller, UseGuards } from '@nestjs/common';
import { TypedRoute, TypedBody } from '@nestia/core';
import { OnboardingService } from './onboarding.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { IOnboardingChatBody, IOnboardingChatResult } from './dto/onboarding.dto.js';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * 온보딩 대화 처리 (최대 3턴).
   * 유저 입력 → 도메인/태그 추천 → 목표 확정.
   * @tag Onboarding
   */
  @TypedRoute.Post('chat')
  async chat(
    @TypedBody() body: IOnboardingChatBody,
  ): Promise<IOnboardingChatResult> {
    return this.onboardingService.chat(body);
  }
}
