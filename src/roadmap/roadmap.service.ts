import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

interface SimilarityRow {
  id: string;
  domain_id: string;
  similarity: number;
}

@Injectable()
export class RoadmapService {
  constructor(private readonly prisma: PrismaService) {}

  async findSimilarTemplate(embedding: number[], threshold = 0.85) {
    const vectorStr = `[${embedding.join(',')}]`;

    const rows = await this.prisma.$queryRaw<SimilarityRow[]>`
      SELECT de.id, de.domain_id,
             1 - (de.embedding <=> ${vectorStr}::vector) as similarity
      FROM domain_embeddings de
      WHERE 1 - (de.embedding <=> ${vectorStr}::vector) > ${threshold}
      ORDER BY similarity DESC
      LIMIT 1
    `;

    if (rows.length === 0) return null;

    const match = rows[0]!;

    // Find a template roadmap that matches this domain
    const templateRoadmap = await this.prisma.roadmap.findFirst({
      where: {
        is_template: true,
        goal: {
          domain_id: match.domain_id,
        },
      },
      include: { checkpoints: { orderBy: { order: 'asc' } } },
    });

    if (!templateRoadmap) return null;

    return {
      roadmapId: templateRoadmap.id,
      similarity: Number(match.similarity),
    };
  }

  async copyTemplate(templateRoadmapId: string, newGoalId: string) {
    const template = await this.prisma.roadmap.findUniqueOrThrow({
      where: { id: templateRoadmapId },
      include: { checkpoints: { orderBy: { order: 'asc' } } },
    });

    const newRoadmap = await this.prisma.roadmap.create({
      data: {
        goal_id: newGoalId,
        title: template.title,
        is_template: false,
        checkpoints: {
          create: template.checkpoints.map((cp) => ({
            title: cp.title,
            description: cp.description,
            tag_id: cp.tag_id,
            difficulty: cp.difficulty,
            order: cp.order,
            status: 'not_started',
            best_score: null,
            attempts: 0,
          })),
        },
      },
      include: { checkpoints: { orderBy: { order: 'asc' } } },
    });

    return newRoadmap;
  }

  async getByGoalId(goalId: string) {
    return this.prisma.roadmap.findUnique({
      where: { goal_id: goalId },
      include: { checkpoints: { orderBy: { order: 'asc' } } },
    });
  }
}
