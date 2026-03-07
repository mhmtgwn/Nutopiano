import { BadRequestException } from '@nestjs/common';
import { OrderLifecycleState } from '@prisma/client';
import { DefaultOrderLifecyclePolicy } from './default-order-lifecycle.policy';

describe('DefaultOrderLifecyclePolicy', () => {
  const policy = new DefaultOrderLifecyclePolicy();

  it('maps known business statuses to lifecycle states', () => {
    expect(policy.resolveFromStatusKey('PAID')).toBe(OrderLifecycleState.PAID);
    expect(policy.resolveFromStatusKey('SHIPPED')).toBe(
      OrderLifecycleState.FULFILLING,
    );
    expect(policy.resolveFromStatusKey('RETURNED')).toBe(
      OrderLifecycleState.REFUNDED,
    );
    expect(policy.resolveFromStatusKey('cancelled_by_seller')).toBe(
      OrderLifecycleState.CANCELLED,
    );
  });

  it('moves to paid only when full amount is collected', () => {
    expect(
      policy.resolveAfterPayment({
        currentState: OrderLifecycleState.PENDING,
        totalAmountCents: 1000,
        paidAmountCents: 900,
      }),
    ).toBe(OrderLifecycleState.PENDING);

    expect(
      policy.resolveAfterPayment({
        currentState: OrderLifecycleState.PENDING,
        totalAmountCents: 1000,
        paidAmountCents: 1000,
      }),
    ).toBe(OrderLifecycleState.PAID);
  });

  it('keeps terminal states unchanged after payment attempts', () => {
    expect(
      policy.resolveAfterPayment({
        currentState: OrderLifecycleState.CANCELLED,
        totalAmountCents: 1000,
        paidAmountCents: 1000,
      }),
    ).toBe(OrderLifecycleState.CANCELLED);
  });

  it('rejects invalid final-status transitions', () => {
    expect(() =>
      policy.assertStatusTransitionAllowed({
        fromStatusKey: 'COMPLETED',
        fromIsFinal: true,
        toStatusKey: 'PAID',
      }),
    ).toThrow(BadRequestException);
  });
});
