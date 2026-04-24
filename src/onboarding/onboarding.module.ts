import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller.js';
import { OnboardingService } from './onboarding.service.js';
import { DomainModule } from '../domain/domain.module.js';
import { GeminiModule } from '../gemini/gemini.module.js';

@Module({
  imports: [DomainModule, GeminiModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
