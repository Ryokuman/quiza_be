import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { DomainModule } from './domain/domain.module.js';
import { RoadmapModule } from './roadmap/roadmap.module.js';
import { GoalModule } from './goal/goal.module.js';
import { PaymentModule } from './payment/payment.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { AnswersModule } from './answers/answers.module.js';
import { QuestionsModule } from './questions/questions.module.js';
import { StatsModule } from './stats/stats.module.js';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
