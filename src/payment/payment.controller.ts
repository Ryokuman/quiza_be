import { Controller, Req } from '@nestjs/common';
import { TypedRoute, TypedBody } from '@nestia/core';
import { PaymentService } from './payment.service';
import type {
  IGenerateNonceBody,
  IGenerateNonceResult,
  IConfirmPaymentBody,
  IPaymentItem,
  IPremiumStatus,
} from './dto/payment.dto';
import type { AuthenticatedRequest } from '../auth/types';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * 신규 결제 reference 생성.
   *
   * QZ-TASK-010에서 App Store/웹 결제 재설계를 마칠 때까지 비활성화한다.
   * @tag Payment
   */
  @TypedRoute.Post('nonce')
  async generateNonce(
    @TypedBody() body: IGenerateNonceBody,
    @Req() req: AuthenticatedRequest,
  ): Promise<IGenerateNonceResult> {
    return this.paymentService.generateNonce(req.user.userId, {
      amount: body.amount,
      productType: body.productType,
    });
  }

  /**
   * 신규 결제 검증.
   *
   * QZ-TASK-010에서 App Store/웹 결제 재설계를 마칠 때까지 비활성화한다.
   * @tag Payment
   */
  @TypedRoute.Post('confirm')
  async confirmPayment(
    @TypedBody() body: IConfirmPaymentBody,
    @Req() req: AuthenticatedRequest,
  ): Promise<IPaymentItem> {
    const payment = await this.paymentService.confirmPayment(req.user.userId, {
      transactionId: body.transactionId,
      reference: body.reference,
    });
    return {
      id: payment.id,
      tx_hash: payment.tx_hash,
      amount: payment.amount_wld.toString(),
      product_type: payment.product_type,
      status: payment.status,
      created_at: payment.created_at.toISOString(),
    };
  }

  /**
   * 미완료(pending) 결제 조회 — 프론트 재진입 시 자동 confirm용.
   * @tag Payment
   */
  @TypedRoute.Get('pending')
  async getPending(@Req() req: AuthenticatedRequest): Promise<IPaymentItem | null> {
    const payment = await this.paymentService.getPendingPayment(req.user.userId);
    if (!payment) return null;
    return {
      id: payment.id,
      tx_hash: payment.tx_hash,
      amount: payment.amount_wld.toString(),
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
      amount: p.amount_wld.toString(),
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
