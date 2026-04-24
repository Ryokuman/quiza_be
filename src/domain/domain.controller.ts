import { Controller, Req, UseGuards } from '@nestjs/common';
import { TypedRoute, TypedParam, TypedBody } from '@nestia/core';
import { DomainService } from './domain.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { Request } from 'express';
import type { IDomainItem, IDomainProgress, IDomainRoadmap } from './dto/domain-response.dto.js';
import type { IDomainSearchBody, IDomainSearchResult } from './dto/domain-search.dto.js';
import type { ISaveEmbeddingBody, ISaveEmbeddingResult } from './dto/save-embedding.dto.js';

interface AuthenticatedRequest extends Request {
  user: { userId: string; worldId: string };
}

@Controller('domains')
export class DomainController {
  constructor(private readonly domainService: DomainService) {}

  /**
   * 전체 도메인 목록 조회.
   * @tag Domain
   */
  @TypedRoute.Get()
  async getAllDomains(): Promise<IDomainItem[]> {
    const domains = await this.domainService.getAllDomains();
    return domains.map((d) => ({
      id: d.id,
      name: d.name,
      created_at: d.created_at.toISOString(),
    }));
  }

  /**
   * 현재 유저의 도메인 목록 + 진행률 조회.
   * @tag Domain
   */
  @TypedRoute.Get('me')
  @UseGuards(JwtAuthGuard)
  async getUserDomains(@Req() req: AuthenticatedRequest): Promise<IDomainProgress[]> {
    return this.domainService.getUserDomains(req.user.userId);
  }

  /**
   * 특정 도메인의 유저 로드맵 조회.
   * @tag Domain
   */
  @TypedRoute.Get(':domainId/roadmap')
  @UseGuards(JwtAuthGuard)
  async getDomainRoadmap(
    @TypedParam('domainId') domainId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<IDomainRoadmap | null> {
    return this.domainService.getDomainRoadmap(req.user.userId, domainId);
  }

  /**
   * 유저 자연어 입력으로 도메인 검색.
   * Gemini로 태그 추출 + 임베딩 유사도 검색.
   * @tag Domain
   */
  @TypedRoute.Post('search')
  async searchDomains(@TypedBody() body: IDomainSearchBody): Promise<IDomainSearchResult> {
    return this.domainService.searchDomains(body.query);
  }

  /**
   * 도메인/Goal 텍스트의 임베딩을 생성하여 저장.
   * @tag Domain
   */
  @TypedRoute.Post('embeddings')
  async saveEmbedding(@TypedBody() body: ISaveEmbeddingBody): Promise<ISaveEmbeddingResult> {
    return this.domainService.saveEmbedding(body.domain, body.goal);
  }
}
