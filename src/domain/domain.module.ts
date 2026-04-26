import { Module } from '@nestjs/common';
import { DomainController } from './domain.controller';
import { DomainService } from './domain.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [PrismaModule, GeminiModule],
  controllers: [DomainController],
  providers: [DomainService],
  exports: [DomainService],
})
export class DomainModule {}
