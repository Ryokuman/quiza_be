import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeminiService } from '../gemini/gemini.service.js';

interface SimilarityRow {
  id: string;
  domain: string;
  similarity: number;
}

@Injectable()
export class DomainService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  async getAllDomains() {
    return this.prisma.domain.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getUserDomains(userId: string) {
    const goals = await this.prisma.userGoal.findMany({
      where: { user_id: userId, is_active: true },
      include: {
        domain: true,
        roadmap: {
          include: {
            checkpoints: {
              select: { status: true },
            },
          },
        },
      },
    });

    return goals.map((g) => {
      const checkpoints = g.roadmap?.checkpoints ?? [];
      return {
        id: g.domain.id,
        name: g.domain.name,
        goalId: g.id,
        target: g.target,
        level: g.level,
        checkpoints: {
          total: checkpoints.length,
          passed: checkpoints.filter((c) => c.status === 'passed').length,
          in_progress: checkpoints.filter((c) => c.status === 'in_progress').length,
        },
      };
    });
  }

  async getDomainRoadmap(userId: string, domainId: string) {
    const goal = await this.prisma.userGoal.findFirst({
      where: { user_id: userId, domain_id: domainId, is_active: true },
      include: {
        roadmap: {
          include: {
            checkpoints: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    return goal?.roadmap ?? null;
  }

  /**
   * b-2: 유저 자연어 입력 → Gemini 태그 추출 → 임베딩 유사도로 도메인 매칭
   */
  async searchDomains(query: string) {
    // 1. Gemini로 태그 추출
    const tags = await this.gemini.extractTags(query);

    // 2. 임베딩 생성 후 유사 도메인 검색
    const embedding = await this.gemini.generateEmbedding(query);
    const vectorStr = `[${embedding.join(',')}]`;

    const matches = await this.prisma.$queryRaw<SimilarityRow[]>`
      SELECT de.id, de.domain,
             1 - (de.embedding <=> ${vectorStr}::vector) as similarity
      FROM domain_embeddings de
      WHERE 1 - (de.embedding <=> ${vectorStr}::vector) > 0.5
      ORDER BY similarity DESC
      LIMIT 5
    `;

    // 3. 임베딩 매칭이 없으면 태그 이름으로 DB 도메인 검색
    let domainMatches = matches.map((m) => ({
      id: m.id,
      name: m.domain,
      similarity: Number(m.similarity),
    }));

    if (domainMatches.length === 0 && tags.length > 0) {
      const domains = await this.prisma.domain.findMany({
        where: { name: { in: tags } },
      });
      domainMatches = domains.map((d) => ({
        id: d.id,
        name: d.name,
        similarity: 1.0,
      }));
    }

    return { tags, matches: domainMatches };
  }

  /**
   * b-3: 도메인/Goal 텍스트의 임베딩을 생성하여 DomainEmbedding에 저장
   */
  async saveEmbedding(domain: string, goal?: string) {
    const text = goal ? `${domain} - ${goal}` : domain;
    const embedding = await this.gemini.generateEmbedding(text);
    const vectorStr = `[${embedding.join(',')}]`;

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO domain_embeddings (id, domain, goal, embedding, created_at)
      VALUES (gen_random_uuid(), ${domain}, ${goal ?? null}, ${vectorStr}::vector, now())
      RETURNING id
    `;

    return {
      id: rows[0]!.id,
      domain,
      goal: goal ?? null,
    };
  }
}
