import { Controller, Req, UseGuards } from '@nestjs/common';
import { TypedRoute, TypedBody } from '@nestia/core';
import { PaymentService } from './payment.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { Request } from 'express';
import type { IVerifyPaymentBody, IPaymentItem, IPremiumStatus } from './dto/payment.dto.js';

interface AuthenticatedRequest extends Request {
  user: { userId: string; worldId: string };
}

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * 결제 트랜잭션 검증 + 프리미엄 활성화.
   * @tag Payment
   */
  @TypedRoute.Post('verify')
  async verifyPayment(
    @TypedBody() body: IVerifyPaymentBody,
    @Req() req: AuthenticatedRequest,
  ): Promise<IPaymentItem> {
    const payment = await this.paymentService.verifyPayment(req.user.userId, {
      txHash: body.txHash,
      amountWld: body.amountWld,
      productType: body.productType,
    });
    return {
      id: payment.id,
      tx_hash: payment.tx_hash,
      amount_wld: payment.amount_wld.toString(),
      product_type: payment.product_type,
      status: payment.status,
      created_at: payment.created_at.toISOString(),
    };
  }

  /**
   * 결제 이력 조회.
   * @tag Payment
   */
  @TypedRoute.Get('history')
  async getHistory(@Req() req: AuthenticatedRequest): Promise<IPaymentItem[]> {
    const payments = await this.paymentService.getPaymentHistory(req.user.userId);
    return payments.map((p) => ({
      id: p.id,
      tx_hash: p.tx_hash,
      amount_wld: p.amount_wld.toString(),
      product_type: p.product_type,
      status: p.status,
      created_at: p.created_at.toISOString(),
    }));
  }

  /**
   * 프리미엄 상태 확인.
   * @tag Payment
   */
  @TypedRoute.Get('premium-status')
  async premiumStatus(@Req() req: AuthenticatedRequest): Promise<IPremiumStatus> {
    return this.paymentService.checkPremiumStatus(req.user.userId);
  }
}
