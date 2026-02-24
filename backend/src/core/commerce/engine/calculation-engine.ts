import {
  CalculationRequestContext,
  CalculationResult,
  CalculationStep,
  CalculationVersionSeed,
  CalculationWorkingContext,
} from '../contracts';
import { buildCalculationVersion } from './calculation-version.util';

const toInt = (value: unknown, min = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(Math.trunc(parsed), min);
};

export class CalculationEngine {
  constructor(private readonly steps: CalculationStep[]) {}

  run(
    request: CalculationRequestContext,
    seedPatch?: Partial<CalculationVersionSeed>,
  ): CalculationResult {
    let ctx = this.createInitialContext(request);

    for (const step of this.steps) {
      ctx = step.execute(ctx);
    }

    const seed: CalculationVersionSeed = {
      stepOrder: this.steps.map((step) => step.key),
      ruleProfileId: request.calculationProfileId ?? 'default',
      commissionRuleSnapshot: request.commissionPolicy ?? null,
      taxProfile: {
        inclusive: ctx.taxInclusive,
        rates: ctx.lines.map((line) => line.taxRateBps),
      },
      roundingPolicy: ctx.roundingMode,
      discountRules: {
        lineDiscounts: request.items.map((line) => line.discountAmountCents ?? 0),
        cartDiscountAmountCents: request.cartDiscountAmountCents ?? 0,
        orderDiscountRule: request.orderDiscountRule ?? null,
      },
      ...seedPatch,
    };

    ctx.calculationVersion = buildCalculationVersion(seed);
    ctx.breakdown = {
      ...ctx.breakdown,
      calculationVersionSeed: seed,
    };

    return {
      channel: ctx.channel,
      businessId: ctx.businessId,
      sellerId: ctx.sellerId ?? null,
      currency: ctx.currency,
      subtotalAmountCents: toInt(ctx.subtotalAmountCents),
      discountAmountCents: toInt(ctx.discountAmountCents),
      taxAmountCents: toInt(ctx.taxAmountCents),
      commissionAmountCents: toInt(ctx.commissionAmountCents),
      shippingCostCents: toInt(ctx.shippingCostCents),
      totalAmountCents: toInt(ctx.totalAmountCents),
      sellerPayoutCents: toInt(ctx.sellerPayoutCents),
      platformRevenueCents: toInt(ctx.platformRevenueCents),
      calculationProfileId: request.calculationProfileId ?? null,
      calculationVersion: ctx.calculationVersion,
      breakdown: ctx.breakdown,
      lines: ctx.lines.map((line) => ({ ...line })),
    };
  }

  private createInitialContext(
    request: CalculationRequestContext,
  ): CalculationWorkingContext {
    return {
      ...request,
      currency: request.currency ?? 'TRY',
      taxInclusive: request.taxInclusive ?? true,
      roundingMode: request.roundingMode ?? 'HALF_UP',
      shippingCostCents: toInt(request.shippingCostCents, 0),
      lines: [],
      subtotalAmountCents: 0,
      discountAmountCents: 0,
      taxAmountCents: 0,
      commissionAmountCents: 0,
      totalAmountCents: 0,
      sellerPayoutCents: 0,
      platformRevenueCents: 0,
      breakdown: {},
      calculationVersion: 'v1:pending',
    };
  }
}
