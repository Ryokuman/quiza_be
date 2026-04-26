import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GeminiService } from '../gemini/gemini.service';

interface SimilarityRow {
  id: string;
  name: string;
  similarity: number;
}

interface TagSimilarityRow {
  id: string;
  name: string;
  similarity: number;
}

@Injectable()
export class DomainService {
  private readonly logger = new Logger(DomainService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  async getAllDomains() {
    return this.prisma.domain.findMany({
      orderBy: { name: 'asc' },
      take: 100,
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
   * 도메인을 생성하고 임베딩을 저장한다.
   */
  async createDomain(name: string, description?: string) {
    const domain = await this.prisma.domain.create({
      data: { name, description },
    });

    const embedding = await this.gemini.generateEmbedding(name);
    const vectorStr = `[${embedding.join(',')}]`;

    await this.prisma.$queryRaw`
      INSERT INTO domain_embeddings (id, domain_id, embedding, created_at)
      VALUES (gen_random_uuid(), ${domain.id}::uuid, ${vectorStr}::vector, now())
    `;

    return domain;
  }

  /**
   * 이름으로 도메인을 찾거나 없으면 새로 생성한다.
   */
  async findOrCreate(name: string, description?: string) {
    const existing = await this.prisma.domain.findUnique({
      where: { name },
    });

    if (existing) return existing;

    return this.createDomain(name, description);
  }

  /**
   * 유저 자연어 입력 → Gemini 태그 추출 → 임베딩 유사도로 도메인 매칭
   */
  async searchDomains(query: string) {
    // 1. Gemini로 태그 추출
    const tags = await this.gemini.extractTags(query);

    // 2. 임베딩 생성 후 유사 도메인 검색
    const embedding = await this.gemini.generateEmbedding(query);

    if (
      !Array.isArray(embedding) ||
      embedding.length === 0 ||
      !embedding.every((v) => typeof v === 'number' && Number.isFinite(v))
    ) {
      this.logger.warn(
        `Invalid embedding from Gemini: length=${Array.isArray(embedding) ? embedding.length : 'N/A'}`,
      );
      return { tags, matches: [] };
    }

    const vectorStr = `[${embedding.join(',')}]`;

    const matches = await this.prisma.$queryRaw<SimilarityRow[]>`
      SELECT d.id, d.name,
             1 - (de.embedding <=> ${vectorStr}::vector) as similarity
      FROM domain_embeddings de
      JOIN domains d ON d.id = de.domain_id
      WHERE 1 - (de.embedding <=> ${vectorStr}::vector) > 0.65
      ORDER BY similarity DESC
      LIMIT 20
    `;

    // 3. 임베딩 매칭이 없으면 태그 이름으로 도메인 검색
    let domainMatches = matches.map((m) => ({
      id: m.id,
      name: m.name,
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
   * 도메인 내에서 임베딩 유사도로 태그를 검색한다.
   */
  async searchTags(domainId: string, query: string) {
    const embedding = await this.gemini.generateEmbedding(query);
    const vectorStr = `[${embedding.join(',')}]`;

    const matches = await this.prisma.$queryRaw<TagSimilarityRow[]>`
      SELECT t.id, t.name,
             1 - (te.embedding <=> ${vectorStr}::vector) as similarity
      FROM tag_embeddings te
      JOIN tags t ON t.id = te.tag_id
      WHERE t.domain_id = ${domainId}::uuid
        AND 1 - (te.embedding <=> ${vectorStr}::vector) > 0.65
      ORDER BY similarity DESC
      LIMIT 10
    `;

    return matches.map((m) => ({
      id: m.id,
      name: m.name,
      similarity: Number(m.similarity),
    }));
  }

  /**
   * 도메인 ID로 해당 도메인의 모든 태그를 조회한다.
   */
  async getTagsByDomainId(domainId: string) {
    return this.prisma.tag.findMany({
      where: { domain_id: domainId },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }

  /**
   * 이름 목록으로 도메인을 검색한다.
   */
  async findDomainsByNames(names: string[]) {
    return this.prisma.domain.findMany({
      where: { name: { in: names } },
    });
  }

  /**
   * 태그를 찾거나 없으면 생성한다.
   */
  async findOrCreateTag(domainId: string, name: string, createdBy = 'llm') {
    const existing = await this.prisma.tag.findUnique({
      where: { domain_id_name: { domain_id: domainId, name } },
    });
    if (existing) return existing;

    const tag = await this.prisma.tag.create({
      data: { name, domain_id: domainId, created_by: createdBy },
    });

    // 태그 임베딩 자동 생성
    const embedding = await this.gemini.generateEmbedding(name);
    const vectorStr = `[${embedding.join(',')}]`;
    await this.prisma.$queryRaw`
      INSERT INTO tag_embeddings (id, tag_id, embedding, created_at)
      VALUES (gen_random_uuid(), ${tag.id}::uuid, ${vectorStr}::vector, now())
    `;

    return tag;
  }
}
