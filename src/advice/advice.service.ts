import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeminiService } from '../gemini/gemini.service.js';
import type { IAdviceResult } from './dto/advice.dto.js';

@Injectable()
export class AdviceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  /** 유저의 약점 데이터를 분석하여 개인화 학습 조언을 생성한다. */
  async generateAdvice(userId: string): Promise<IAdviceResult> {
    // 태그별 통계 집계
    const answers = await this.prisma.userAnswer.findMany({
      where: { user_id: userId },
      include: {
        question: {
          include: { tag: { select: { name: true } } },
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

    const advice = await this.generateGeminiAdvice(weakTags);

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

  private async generateGeminiAdvice(
    weakTags: { tag: string; accuracy: number; scoreRate: number; total: number }[],
  ): Promise<string> {
    const model = this.gemini['client'].getGenerativeModel({ model: 'gemini-2.0-flash' });

    const statsText = weakTags
      .map((t) => `- ${t.tag}: 정답률 ${t.accuracy}%, 점수율 ${t.scoreRate}%, 총 ${t.total}문제`)
      .join('\n');

    const result = await model.generateContent(
      `당신은 학습 코치입니다. 아래는 학생의 약점 태그 분석 결과입니다.

${statsText}

위 데이터를 바탕으로:
1. 가장 시급히 보완해야 할 영역
2. 구체적인 학습 전략 (2~3가지)
3. 격려의 말

한국어로 300자 내외로 조언해주세요. 마크다운 없이 평문으로.`,
    );

    return result.response.text().trim();
  }
}
