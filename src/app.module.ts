import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DomainModule } from './domain/domain.module';
import { RoadmapModule } from './roadmap/roadmap.module';
import { GoalModule } from './goal/goal.module';
import { PaymentModule } from './payment/payment.module';
import { SessionsModule } from './sessions/sessions.module';
import { AnswersModule } from './answers/answers.module';
import { QuestionsModule } from './questions/questions.module';
import { StatsModule } from './stats/stats.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AdviceModule } from './advice/advice.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    DomainModule,
    RoadmapModule,
    GoalModule,
    PaymentModule,
    SessionsModule,
    AnswersModule,
    QuestionsModule,
    StatsModule,
    OnboardingModule,
    AdviceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
