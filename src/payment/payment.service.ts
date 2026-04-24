import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PaymentService {
  private readonly appId: string;
  private readonly apiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.appId = this.configService.getOrThrow<string>('WORLD_APP_ID');
    this.apiKey = this.configService.getOrThrow<string>('DEV_PORTAL_API_KEY');
  }

  /**
   * 결제 nonce(reference) 생성 — 프론트에서 MiniKit.pay() 호출 전에 요청.
   */
  async generateNonce(
    userId: string,
    input: { amountWld: number; productType: string },
  ) {
    if (input.amountWld <= 0) {
      throw new BadRequestException('결제 금액은 0보다 커야 합니다');
    }

    const payment = await this.prisma.payment.create({
      data: {
        user_id: userId,
        amount_wld: input.amountWld,
        product_type: input.productType,
        status: 'pending',
      },
    });

    return {
      reference: payment.id,
      amountWld: input.amountWld,
      productType: input.productType,
    };
  }

  /**
   * 결제 검증 — 프론트에서 MiniKit.pay() 응답 후 호출.
   * Developer Portal API + reference 매칭으로 검증.
   */
  async confirmPayment(
    userId: string,
    input: { transactionId: string; reference: string },
  ) {
    // 1. reference로 pending 결제 찾기
    const payment = await this.prisma.payment.findUnique({
      where: { id: input.reference },
    });

    if (!payment || payment.user_id !== userId) {
      throw new BadRequestException('유효하지 않은 reference');
    }

    if (payment.status !== 'pending') {
      throw new ConflictException('이미 처리된 결제입니다');
    }

    // 2. Developer Portal API로 트랜잭션 검증
    const res = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${input.transactionId}?app_id=${this.appId}&type=payment`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      },
    );

    if (!res.ok) {
      throw new BadRequestException('트랜잭션 검증 실패');
    }

    const tx = (await res.json()) as { reference: string };

    // 3. reference 매칭
    if (tx.reference !== input.reference) {
      throw new BadRequestException('reference 불일치');
    }

    // 4. 확정 + 프리미엄 활성화
    const [confirmed] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { tx_hash: input.transactionId, status: 'confirmed' },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { is_premium: true },
      }),
    ]);

    return confirmed;
  }

  async getPaymentHistory(userId: string) {
    return this.prisma.payment.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  async checkPremiumStatus(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { is_premium: true },
    });
    return { isPremium: user.is_premium };
  }
}
