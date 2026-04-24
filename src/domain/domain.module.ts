import { Module } from '@nestjs/common';
import { DomainController } from './domain.controller.js';
import { DomainService } from './domain.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { GeminiModule } from '../gemini/gemini.module.js';

@Module({
  imports: [PrismaModule, GeminiModule],
  controllers: [DomainController],
  providers: [DomainService],
  exports: [DomainService],
})
export class DomainModule {}
