import { Module } from '@nestjs/common';
import { GoalController } from './goal.controller';
import { GoalService } from './goal.service';
import { PrismaModule } from '../database/prisma.module';
import { DomainModule } from '../domain/domain.module';
import { RoadmapModule } from '../roadmap/roadmap.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [PrismaModule, DomainModule, RoadmapModule, GeminiModule],
  controllers: [GoalController],
  providers: [GoalService],
  exports: [GoalService],
})
export class GoalModule {}
