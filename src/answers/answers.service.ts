import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AnswersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 답안을 채점하고 저장한다.
   *
   * 1. 문제의 정답과 비교하여 채점
   * 2. UserAnswer 레코드 생성 (session_id가 있으면 연결)
   * 3. UserQuestionStats 갱신 (HLR 반감기 조정)
   *    - 정답: half_life × 2 (기억 강화)
   *    - 오답: half_life × 0.5 (기억 약화)
   *    - 초기 half_life: 86400초 (1일)
   */
  async submit(
    userId: string,
    questionId: string,
    userAnswer: string,
    sessionId?: string,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const isCorrect =
      question.answer.trim().toLowerCase() ===
      userAnswer.trim().toLowerCase();

    // UserAnswer 저장
    await this.prisma.userAnswer.create({
      data: {
        user_id: userId,
        question_id: questionId,
        user_answer: userAnswer,
        is_correct: isCorrect,
        ...(sessionId ? { session_id: sessionId } : {}),
      },
    });

    // UserQuestionStats 갱신 (upsert)
    await this.updateStats(userId, questionId, isCorrect);

    return {
      is_correct: isCorrect,
      correct_answer: question.answer,
      explanation: question.explanation,
    };
  }

  /**
   * HLR 반감기를 갱신한다.
   *
   * - 기존 stats가 없으면 생성 (초기 half_life = 86400)
   * - 정답: half_life × 2
   * - 오답: half_life × 0.5
   */
  private async updateStats(
    userId: string,
    questionId: string,
    isCorrect: boolean,
  ) {
    const existing = await this.prisma.userQuestionStats.findUnique({
      where: {
        user_id_question_id: { user_id: userId, question_id: questionId },
      },
    });

    const now = new Date();
    const INITIAL_HALF_LIFE = 86400; // 1일 (초)

    if (!existing) {
      // 첫 시도
      await this.prisma.userQuestionStats.create({
        data: {
          user_id: userId,
          question_id: questionId,
          total_attempts: 1,
          correct_count: isCorrect ? 1 : 0,
          half_life: isCorrect
            ? INITIAL_HALF_LIFE * 2
            : INITIAL_HALF_LIFE * 0.5,
          last_seen_at: now,
        },
      });
    } else {
      // 기존 기록 갱신
      const newHalfLife = isCorrect
        ? existing.half_life * 2
        : existing.half_life * 0.5;

      await this.prisma.userQuestionStats.update({
        where: {
          user_id_question_id: { user_id: userId, question_id: questionId },
        },
        data: {
          total_attempts: { increment: 1 },
          correct_count: isCorrect
            ? { increment: 1 }
            : existing.correct_count,
          half_life: newHalfLife,
          last_seen_at: now,
        },
      });
    }
  }
}
