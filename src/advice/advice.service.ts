import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import type { IAdviceResult } from './dto/advice.dto';

@Injectable()
export class AdviceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  /** 유저의 약점 데이터를 분석하여 개인화 학습 조언을 생성한다. */
  async generateAdvice(userId: string): Promise<IAdviceResult> {
    // 최근 1000건만 조회하여 메모리 사용량 제한
    const answers = await this.prisma.userAnswer.findMany({
      where: { user_id: userId },
      orderBy: { answered_at: 'desc' },
      take: 1000,
      select: {
        is_correct: true,
        score: true,
        question: {
          select: {
            max_score: true,
            tag: { select: { name: true } },
          },
        },
      },
    });

    if (answers.length === 0) {
      return {
        advice: '아직 풀이 데이터가 없습니다. 문제를 풀어보세요!',
        weak_tags: [],
      };
    }

    const tagMap = new Map<string, { total: number; correct: number; totalScore: number; maxPossible: number }>();

    for (const a of answers) {
      const tagName = a.question.tag.name;
      const entry = tagMap.get(tagName) ?? { total: 0, correct: 0, totalScore: 0, maxPossible: 0 };
      entry.total++;
      if (a.is_correct) entry.correct++;
      entry.totalScore += a.score ?? (a.is_correct ? 1 : 0);
      entry.maxPossible += a.question.max_score;
      tagMap.set(tagName, entry);
    }

    // 정답률 낮은 순 정렬 → 약점 태그 추출
    const tagStats = Array.from(tagMap.entries())
      .map(([tag, s]) => ({
        tag,
        accuracy: s.total === 0 ? 0 : Math.round((s.correct / s.total) * 100),
        scoreRate: s.maxPossible === 0 ? 0 : Math.round((s.totalScore / s.maxPossible) * 100),
        total: s.total,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    const weakTags = tagStats.filter((t) => t.accuracy < 70).slice(0, 5);

    if (weakTags.length === 0) {
      return {
        advice: '모든 태그에서 70% 이상의 정답률을 기록하고 있습니다. 잘하고 있어요!',
        weak_tags: [],
      };
    }

    const statsText = weakTags
      .map((t) => `- ${t.tag}: 정답률 ${t.accuracy}%, 점수율 ${t.scoreRate}%, 총 ${t.total}문제`)
      .join('\n');

    const advice = await this.gemini.generateAdvice(statsText);

    return {
      advice,
      weak_tags: weakTags.map((t) => ({
        tag: t.tag,
        accuracy: t.accuracy,
        score_rate: t.scoreRate,
        total_attempts: t.total,
      })),
    };
  }
}
