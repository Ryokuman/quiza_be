import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module.js';
import { AdviceController } from './advice.controller.js';
import { AdviceService } from './advice.service.js';

@Module({
  imports: [GeminiModule],
  controllers: [AdviceController],
  providers: [AdviceService],
})
export class AdviceModule {}
