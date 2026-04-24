import { Controller, UseGuards } from '@nestjs/common';
import { TypedRoute } from '@nestia/core';
import { DomainsService } from './domains.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { tags } from 'typia';

/** 도메인 응답 */
export interface IDomain {
  /** 도메인 고유 ID */
  id: string & tags.Format<'uuid'>;

  /** 도메인 이름 (예: "영어", "요리") */
  name: string;

  /** 생성 시각 */
  created_at: string & tags.Format<'date-time'>;
}

@Controller('domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  /**
   * 도메인 목록 조회.
   *
   * 학습 가능한 도메인 목록을 반환한다.
   * v2에서는 "영어" 도메인 1개만 존재.
   * 온보딩 UI에서 도메인 선택 시 사용.
   *
   * @tag Domains
   */
  @TypedRoute.Get()
  @UseGuards(JwtAuthGuard)
  async findAll(): Promise<IDomain[]> {
    return this.domainsService.findAll() as any;
  }
}
