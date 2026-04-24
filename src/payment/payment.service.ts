import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyPayment(
    userId: string,
    input: { txHash: string; amountWld: number; productType: string },
  ) {
    // Prevent double-processing
    const existing = await this.prisma.payment.findUnique({
      where: { tx_hash: input.txHash },
    });
    if (existing) {
      throw new ConflictException('이미 처리된 트랜잭션입니다');
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        user_id: userId,
        tx_hash: input.txHash,
        amount_wld: input.amountWld,
        product_type: input.productType,
        status: 'pending',
      },
    });

    // TODO: Verify tx_hash on World Chain (actual blockchain verification)
    // - Fetch transaction receipt from World Chain RPC
    // - Verify recipient address, amount, and confirmation count
    // - For now, we trust the client and mark as confirmed

    // Update payment status + user premium
    const [confirmed] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'confirmed' },
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
