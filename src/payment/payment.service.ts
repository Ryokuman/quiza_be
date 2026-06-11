import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PaymentStatus, type Payment } from '../prisma/client';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 신규 결제 생성은 QZ-TASK-010 결제 재설계 전까지 비활성화한다.
   */
  async generateNonce(
    userId: string,
    input: { amount: number; productType: string },
  ): Promise<{ reference: string; amount: number; productType: string }> {
    void userId;
    void input;
    throw new ServiceUnavailableException('결제는 App Store/웹 결제 재설계 후 다시 활성화됩니다');
  }

  /**
   * 신규 결제 검증은 QZ-TASK-010 결제 재설계 전까지 비활성화한다.
   */
  async confirmPayment(
    userId: string,
    input: { transactionId: string; reference: string },
  ): Promise<Payment> {
    void userId;
    void input;
    throw new ServiceUnavailableException('결제는 App Store/웹 결제 재설계 후 다시 활성화됩니다');
  }

  async getPendingPayment(userId: string) {
    return this.prisma.payment.findFirst({
      where: { user_id: userId, status: PaymentStatus.pending },
      orderBy: { created_at: 'desc' },
    });
  }

  async getPaymentHistory(userId: string) {
    return this.prisma.payment.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
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
