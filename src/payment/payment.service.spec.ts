import assert from 'node:assert/strict';
import test from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import { PaymentService } from './payment.service';

function buildService() {
  const prisma = {
    payment: {
      create: async () => {
        throw new Error('payment.create should not be called while billing is disabled');
      },
      findUnique: async () => {
        throw new Error('payment.findUnique should not be called while billing is disabled');
      },
    },
    user: {
      findUniqueOrThrow: async () => ({ is_premium: false }),
    },
  };

  const config = {
    getOrThrow: () => {
      throw new Error('Legacy payment config should not be required');
    },
  };

  return new PaymentService(prisma as never, config as never);
}

test('결제 reference 생성은 QZ010 결제 재설계 전까지 비활성화한다', async () => {
  const service = buildService();

  await assert.rejects(
    () => service.generateNonce('user-1', { amount: 1, productType: 'premium_monthly' }),
    ServiceUnavailableException,
  );
});

test('결제 검증은 QZ010 결제 재설계 전까지 비활성화한다', async () => {
  const service = buildService();

  await assert.rejects(
    () => service.confirmPayment('user-1', {
      transactionId: 'transaction-1',
      reference: 'payment-1',
    }),
    ServiceUnavailableException,
  );
});
