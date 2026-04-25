import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module.js';
import { QuestionsController } from './questions.controller.js';
import { QuestionsService } from './questions.service.js';

@Module({
  imports: [GeminiModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
