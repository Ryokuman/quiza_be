import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module';
import { AnswersController } from './answers.controller';
import { AnswersService } from './answers.service';

@Module({
  imports: [GeminiModule],
  controllers: [AnswersController],
  providers: [AnswersService],
})
export class AnswersModule {}
