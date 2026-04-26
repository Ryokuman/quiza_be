import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  imports: [GeminiModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
