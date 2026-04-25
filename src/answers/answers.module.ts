import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module.js';
import { AnswersController } from './answers.controller.js';
import { AnswersService } from './answers.service.js';

@Module({
  imports: [GeminiModule],
  controllers: [AnswersController],
  providers: [AnswersService],
})
export class AnswersModule {}
