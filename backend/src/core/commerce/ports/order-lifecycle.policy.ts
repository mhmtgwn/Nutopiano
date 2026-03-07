import { OrderLifecycleState } from '@prisma/client';

export abstract class OrderLifecyclePolicy {
  abstract assertStatusTransitionAllowed(params: {
    fromStatusKey?: string | null;
    fromIsFinal?: boolean | null;
    toStatusKey?: string | null;
  }): void;

  abstract resolveFromStatusKey(statusKey?: string | null): OrderLifecycleState;

  abstract resolveAfterPayment(params: {
    currentState: OrderLifecycleState;
    totalAmountCents: number;
    paidAmountCents: number;
  }): OrderLifecycleState;

  abstract resolveAfterRefund(params: {
    currentState: OrderLifecycleState;
    totalAmountCents: number;
    refundedAmountCents: number;
    approved?: boolean;
  }): OrderLifecycleState;
}
