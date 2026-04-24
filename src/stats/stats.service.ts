import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { IStats, ITagStat, IRoadmapProgress } from './dto/stats.dto.js';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 유저의 종합 통계를 조회한다. */
  async getStats(userId: string): Promise<IStats> {
    const [tagStats, totalAnswered, roadmapProgress] = await Promise.all([
      this.getTagStats(userId),
      this.getTotalAnswered(userId),
      this.getRoadmapProgress(userId),
    ]);

    return {
      tag_stats: tagStats,
      total_answered: totalAnswered,
      roadmap_progress: roadmapProgress,
    };
  }

  /** 태그별 정답률 통계를 계산한다. */
  private async getTagStats(userId: string): Promise<ITagStat[]> {
    const answers = await this.prisma.userAnswer.findMany({
      where: { user_id: userId },
      include: { question: { select: { tag: true } } },
    });

    const tagMap = new Map<string, { total: number; correct: number }>();

    for (const answer of answers) {
      const tag = answer.question.tag;
      const entry = tagMap.get(tag) ?? { total: 0, correct: 0 };
      entry.total++;
      if (answer.is_correct) {
        entry.correct++;
      }
      tagMap.set(tag, entry);
    }

    return Array.from(tagMap.entries()).map(([tag, { total, correct }]) => ({
      tag,
      total,
      correct,
      accuracy: total === 0 ? 0 : Math.round((correct / total) * 100),
    }));
  }

  /** 총 답변 수를 조회한다. */
  private async getTotalAnswered(userId: string): Promise<number> {
    return this.prisma.userAnswer.count({
      where: { user_id: userId },
    });
  }

  /** 유저의 모든 로드맵에 대한 종합 진행률을 계산한다. */
  private async getRoadmapProgress(userId: string): Promise<IRoadmapProgress> {
    const roadmaps = await this.prisma.roadmap.findMany({
      where: { goal: { user_id: userId } },
      select: { id: true },
    });

    if (roadmaps.length === 0) {
      return { passed: 0, total: 0, percentage: 0 };
    }

    const roadmapIds = roadmaps.map((r) => r.id);

    const [total, passed] = await Promise.all([
      this.prisma.checkpoint.count({
        where: { roadmap_id: { in: roadmapIds } },
      }),
      this.prisma.checkpoint.count({
        where: { roadmap_id: { in: roadmapIds }, status: 'passed' },
      }),
    ]);

    return {
      passed,
      total,
      percentage: total === 0 ? 0 : Math.round((passed / total) * 100),
    };
  }
}
