import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { DomainModule } from '../domain/domain.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [DomainModule, GeminiModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
