import { Controller, ForbiddenException, Req } from '@nestjs/common';
import { TypedRoute, TypedBody } from '@nestia/core';
import { QuestionsService } from './questions.service';
import { PrismaService } from '../prisma/prisma.service';
import type { IGenerateQuestions, IGenerateResult } from './dto/question.dto';
import type { AuthenticatedRequest } from '../auth/types';

@Controller('questions')
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 프리미엄 유저 전용 — AI 문제를 생성한다.
   *
   * 태그, 난이도, 개수를 지정하면 해당 조건에 맞는 문제를 생성하여
   * question bank에 저장한다. 생성된 문제는 모든 유저가 사용할 수 있다.
   *
   * 현재는 플레이스홀더 문제를 반환하며, 추후 Gemini API 연동 예정.
   *
   * @param body 태그 + 난이도 + 생성 개수
   * @tag Questions
   */
  @TypedRoute.Post('generate')
  async generate(
    @Req() req: AuthenticatedRequest,
    @TypedBody() body: IGenerateQuestions,
  ): Promise<IGenerateResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user?.is_premium) {
      throw new ForbiddenException('Premium subscription required');
    }

    // TODO: 일일 생성 한도 체크 (예: 하루 최대 50문제)

    const questions = await this.questionsService.generate(body);
    return { questions };
  }
}
