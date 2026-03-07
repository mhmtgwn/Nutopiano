import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderLifecycleState } from '@prisma/client';
import { OrderLifecyclePolicy } from '../ports';

const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['IN_PROGRESS', 'PAID', 'COMPLETED', 'CANCELLED'],
  CREATED: [
    'IN_PROGRESS',
    'PAID',
    'COMPLETED',
    'CANCELLED',
    'RETURN_REQUESTED',
  ],
  IN_PROGRESS: [
    'PAID',
    'SHIPPED',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'RETURN_REQUESTED',
  ],
  PAID: [
    'IN_PROGRESS',
    'SHIPPED',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'RETURN_REQUESTED',
  ],
  SHIPPED: ['DELIVERED', 'COMPLETED', 'RETURN_REQUESTED', 'CANCELLED'],
  DELIVERED: ['COMPLETED', 'RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'RETURN_REJECTED', 'CANCELLED', 'COMPLETED'],
  RETURN_REJECTED: ['DELIVERED', 'COMPLETED'],
};

@Injectable()
export class DefaultOrderLifecyclePolicy extends OrderLifecyclePolicy {
  private readonly terminalStates = new Set<OrderLifecycleState>([
    OrderLifecycleState.CANCELLED,
    OrderLifecycleState.REFUNDED,
  ]);

  assertStatusTransitionAllowed(params: {
    fromStatusKey?: string | null;
    fromIsFinal?: boolean | null;
    toStatusKey?: string | null;
  }): void {
    const from = String(params.fromStatusKey ?? '')
      .trim()
      .toUpperCase();
    const to = String(params.toStatusKey ?? '')
      .trim()
      .toUpperCase();

    if (!from || !to || from === to) {
      return;
    }

    if (params.fromIsFinal) {
      throw new BadRequestException(
        `Final durumdan gecis yapilamaz: ${from} -> ${to}`,
      );
    }

    const allowedNext = ORDER_STATUS_TRANSITIONS[from];
    if (!allowedNext) {
      return;
    }

    if (!allowedNext.includes(to)) {
      throw new BadRequestException(`Gecersiz durum gecisi: ${from} -> ${to}`);
    }
  }

  resolveFromStatusKey(statusKey?: string | null): OrderLifecycleState {
    const key = String(statusKey ?? '')
      .trim()
      .toUpperCase();

    switch (key) {
      case 'DRAFT':
        return OrderLifecycleState.DRAFT;
      case 'AUTHORIZED':
        return OrderLifecycleState.AUTHORIZED;
      case 'PAID':
      case 'CONFIRMED':
        return OrderLifecycleState.PAID;
      case 'IN_PROGRESS':
      case 'PROCESSING':
      case 'SHIPPED':
        return OrderLifecycleState.FULFILLING;
      case 'DELIVERED':
      case 'COMPLETED':
        return OrderLifecycleState.FULFILLED;
      case 'RETURN_REQUESTED':
        return OrderLifecycleState.REFUND_PENDING;
      case 'RETURNED':
      case 'REFUNDED':
        return OrderLifecycleState.REFUNDED;
      default:
        if (key.includes('CANCEL')) return OrderLifecycleState.CANCELLED;
        if (key.includes('RETURN')) return OrderLifecycleState.REFUND_PENDING;
        if (key.includes('FAIL')) return OrderLifecycleState.PENDING;
        return OrderLifecycleState.PENDING;
    }
  }

  resolveAfterPayment(params: {
    currentState: OrderLifecycleState;
    totalAmountCents: number;
    paidAmountCents: number;
  }): OrderLifecycleState {
    if (this.terminalStates.has(params.currentState)) {
      return params.currentState;
    }

    if (params.paidAmountCents < params.totalAmountCents) {
      return params.currentState;
    }

    if (
      params.currentState === OrderLifecycleState.FULFILLING ||
      params.currentState === OrderLifecycleState.FULFILLED ||
      params.currentState === OrderLifecycleState.REFUND_PENDING
    ) {
      return params.currentState;
    }

    return OrderLifecycleState.PAID;
  }

  resolveAfterRefund(params: {
    currentState: OrderLifecycleState;
    totalAmountCents: number;
    refundedAmountCents: number;
    approved?: boolean;
  }): OrderLifecycleState {
    if (!params.approved) {
      return params.currentState;
    }
    if (params.refundedAmountCents >= params.totalAmountCents) {
      return OrderLifecycleState.REFUNDED;
    }
    return OrderLifecycleState.REFUND_PENDING;
  }
}
