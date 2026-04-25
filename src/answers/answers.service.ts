import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeminiService } from '../gemini/gemini.service.js';

@Injectable()
export class AnswersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  /**
   * 답안을 채점하고 저장한다.
   * 타입별 분기: multi → 문자열 매칭, single → 오타/의미 판단, essay → Gemini 채점
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

    let isCorrect: boolean;
    let score: number | null = null;
    let gradeReason: string | null = null;

    switch (question.type) {
      case 'essay': {
        const result = await this.gemini.gradeEssay(
          question.content,
          question.answer,
          question.rubric ?? '',
          question.max_score,
          userAnswer,
        );
        score = result.score;
        gradeReason = result.reason;
        isCorrect = score >= question.max_score * 0.6;
        break;
      }

      case 'single': {
        const graded = await this.gradeSingle(question.answer, userAnswer);
        isCorrect = graded.isCorrect;
        score = isCorrect ? question.max_score : 0;
        gradeReason = graded.reason;
        break;
      }

      default: {
        // multi — 기존 문자열 매칭
        isCorrect =
          question.answer.trim().toLowerCase() ===
          userAnswer.trim().toLowerCase();
        score = isCorrect ? question.max_score : 0;
        break;
      }
    }

    await this.prisma.userAnswer.create({
      data: {
        user_id: userId,
        question_id: questionId,
        user_answer: userAnswer,
        is_correct: isCorrect,
        score,
        grade_reason: gradeReason,
        ...(sessionId ? { session_id: sessionId } : {}),
      },
    });

    await this.updateStats(userId, questionId, isCorrect, score, question.max_score);

    return {
      is_correct: isCorrect,
      correct_answer: question.answer,
      explanation: question.explanation,
      score,
      grade_reason: gradeReason,
    };
  }

  /**
   * 단답형 채점: 편집 거리 ≤ 2 → 정답, > 2 → Gemini 의미 판단
   */
  private async gradeSingle(
    correctAnswer: string,
    userAnswer: string,
  ): Promise<{ isCorrect: boolean; reason: string | null }> {
    const a = correctAnswer.trim().toLowerCase();
    const b = userAnswer.trim().toLowerCase();

    if (a === b) {
      return { isCorrect: true, reason: null };
    }

    const dist = this.levenshtein(a, b);
    if (dist <= 2) {
      return { isCorrect: true, reason: `오타 허용 (편집 거리: ${dist})` };
    }

    // Gemini 의미 판단
    const result = await this.gemini.judgeSingleAnswer(correctAnswer, userAnswer);
    return { isCorrect: result.isCorrect, reason: result.reason };
  }

  /** 레벤슈타인 편집 거리 */
  private levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }

    return dp[m][n];
  }

  /**
   * HLR 반감기를 갱신한다. 부분점수 반영.
   */
  private async updateStats(
    userId: string,
    questionId: string,
    isCorrect: boolean,
    score: number | null,
    maxScore: number,
  ) {
    const existing = await this.prisma.userQuestionStats.findUnique({
      where: {
        user_id_question_id: { user_id: userId, question_id: questionId },
      },
    });

    const now = new Date();
    const INITIAL_HALF_LIFE = 86400;

    // 부분점수 비율 (0.0 ~ 1.0)
    const ratio = score != null && maxScore > 0 ? score / maxScore : isCorrect ? 1 : 0;
    // 반감기 배수: 0점 → 0.5, 만점 → 2.0, 부분점수 → 선형 보간
    const multiplier = 0.5 + 1.5 * ratio;

    if (!existing) {
      await this.prisma.userQuestionStats.create({
        data: {
          user_id: userId,
          question_id: questionId,
          total_attempts: 1,
          correct_count: isCorrect ? 1 : 0,
          half_life: INITIAL_HALF_LIFE * multiplier,
          last_seen_at: now,
        },
      });
    } else {
      const newHalfLife = existing.half_life * multiplier;

      await this.prisma.userQuestionStats.update({
        where: {
          user_id_question_id: { user_id: userId, question_id: questionId },
        },
        data: {
          total_attempts: { increment: 1 },
          correct_count: isCorrect ? { increment: 1 } : existing.correct_count,
          half_life: newHalfLife,
          last_seen_at: now,
        },
      });
    }
  }
}
