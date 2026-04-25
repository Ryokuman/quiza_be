import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 체크포인트 기반으로 세션을 구성한다.
   *
   * 1. Checkpoint의 tag_id + difficulty로 문제 은행에서 후보 조회
   * 2. UserQuestionStats에서 p(recall) < 0.5인 복습 문제 추출
   * 3. 복습 ~40% + 새 문제 ~60% 비율로 ~15문제 구성
   * 4. Session 레코드를 DB에 생성
   *
   * difficulty는 ±1 범위까지 허용하여 문제 풀을 넓힌다.
   */
  async createSession(userId: string, checkpointId: string) {
    const checkpoint = await this.prisma.checkpoint.findUnique({
      where: { id: checkpointId },
    });
    if (!checkpoint) {
      throw new NotFoundException('Checkpoint not found');
    }

    const { tag_id, difficulty } = checkpoint;
    const TARGET_COUNT = 15;
    const REVIEW_RATIO = 0.4;

    // 복습 대상 조회: p(recall) < 0.5인 문제
    const reviewQuestions = await this.getReviewQuestions(
      userId,
      tag_id,
      difficulty,
    );

    // 복습 문제 수 결정 (~40%, 최대 가용 수)
    const reviewCount = Math.min(
      Math.floor(TARGET_COUNT * REVIEW_RATIO),
      reviewQuestions.length,
    );
    const newCount = TARGET_COUNT - reviewCount;

    // 복습 대상 문제 ID 목록
    const reviewIds = reviewQuestions
      .slice(0, reviewCount)
      .map((q) => q.question_id);

    // 새 문제 조회 (복습 대상 제외, difficulty ±1 범위)
    const newQuestions = await this.prisma.question.findMany({
      where: {
        tag_id,
        difficulty: {
          gte: Math.max(1, difficulty - 1),
          lte: Math.min(5, difficulty + 1),
        },
        id: { notIn: reviewIds },
      },
      take: newCount,
      select: {
        id: true,
        tag_id: true,
        tag: { select: { id: true, name: true } },
        type: true,
        difficulty: true,
        content: true,
        options: true,
        // answer, explanation은 제외 — 클라이언트에 노출하지 않음
      },
    });

    // 복습 문제 조회
    const reviewQuestionsData =
      reviewIds.length > 0
        ? await this.prisma.question.findMany({
            where: { id: { in: reviewIds } },
            select: {
              id: true,
              tag_id: true,
              tag: { select: { id: true, name: true } },
              type: true,
              difficulty: true,
              content: true,
              options: true,
            },
          })
        : [];

    // 복습 + 새 문제 합치고 셔플
    const allQuestions = [...reviewQuestionsData, ...newQuestions];
    this.shuffle(allQuestions);

    // Session 레코드 생성
    const session = await this.prisma.session.create({
      data: {
        user_id: userId,
        checkpoint_id: checkpointId,
        total: allQuestions.length,
      },
    });

    return { session_id: session.id, questions: allQuestions };
  }

  /**
   * 세션을 완료하고 체크포인트를 평가한다.
   *
   * 1. 세션에 연결된 UserAnswer를 조회하여 채점
   * 2. Session 레코드 갱신 (score, correct, total, status, completed_at)
   * 3. Checkpoint 갱신 (attempts, best_score, status)
   */
  async completeSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.user_id !== userId) {
      throw new NotFoundException('Session not found');
    }

    // 세션에 연결된 답안 조회
    const answers = await this.prisma.userAnswer.findMany({
      where: { session_id: sessionId },
    });

    const total = answers.length;
    const correct = answers.filter((a) => a.is_correct).length;
    const score = total > 0 ? correct / total : 0;
    const passed = score >= 0.7;

    // Session 갱신
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        score,
        correct,
        total,
        status: 'completed',
        completed_at: new Date(),
      },
    });

    // Checkpoint 갱신
    const checkpoint = await this.prisma.checkpoint.findUnique({
      where: { id: session.checkpoint_id },
    });

    const newBestScore = Math.max(checkpoint!.best_score ?? 0, score);
    const newStatus = passed ? 'passed' : 'in_progress';

    await this.prisma.checkpoint.update({
      where: { id: session.checkpoint_id },
      data: {
        attempts: { increment: 1 },
        best_score: newBestScore,
        status: newStatus,
      },
    });

    return {
      score,
      total,
      correct,
      passed,
      checkpoint_status: newStatus,
    };
  }

  /**
   * HLR 복습 대상을 조회한다.
   *
   * p(recall) = 2^(-Δ/h)
   * Δ = now - last_seen_at (초)
   * h = half_life (초)
   * p < 0.5 이면 복습 대상
   */
  private async getReviewQuestions(
    userId: string,
    tagId: string,
    difficulty: number,
  ) {
    const stats = await this.prisma.userQuestionStats.findMany({
      where: {
        user_id: userId,
        question: {
          tag_id: tagId,
          difficulty: {
            gte: Math.max(1, difficulty - 1),
            lte: Math.min(5, difficulty + 1),
          },
        },
      },
      include: { question: true },
    });

    const now = Date.now();

    return stats.filter((s) => {
      const deltaSeconds = (now - s.last_seen_at.getTime()) / 1000;
      const pRecall = Math.pow(2, -deltaSeconds / s.half_life);
      return pRecall < 0.5;
    });
  }

  /** Fisher-Yates 셔플 */
  private shuffle<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
