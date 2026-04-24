import { Module } from '@nestjs/common';
import { GoalController } from './goal.controller.js';
import { GoalService } from './goal.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RoadmapModule } from '../roadmap/roadmap.module.js';

@Module({
  imports: [PrismaModule, RoadmapModule],
  controllers: [GoalController],
  providers: [GoalService],
  exports: [GoalService],
})
export class GoalModule {}
