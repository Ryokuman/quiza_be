import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DomainsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 전체 도메인 목록을 반환한다. */
  async findAll() {
    const domains = await this.prisma.domain.findMany({
      orderBy: { created_at: 'asc' },
    });
    return domains.map((d) => ({
      ...d,
      created_at: d.created_at.toISOString(),
    }));
  }
}
