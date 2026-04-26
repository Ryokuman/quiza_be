import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module';
import { AdviceController } from './advice.controller';
import { AdviceService } from './advice.service';

@Module({
  imports: [GeminiModule],
  controllers: [AdviceController],
  providers: [AdviceService],
})
export class AdviceModule {}
