import { CalculationStep, CalculationWorkingContext } from '../../contracts';

export class FinalizeStep implements CalculationStep {
  readonly key = 'finalize';

  execute(ctx: CalculationWorkingContext): CalculationWorkingContext {
    const subtotalAmountCents = ctx.lines.reduce(
      (acc, line) => acc + line.grossBeforeDiscountCents,
      0,
    );
    const discountAmountCents = ctx.lines.reduce(
      (acc, line) => acc + line.lineDiscountCents + line.orderDiscountShareCents,
      0,
    );
    const taxAmountCents = ctx.lines.reduce((acc, line) => acc + line.taxAmountCents, 0);
    const linesTotal = ctx.lines.reduce((acc, line) => acc + line.lineTotalCents, 0);
    const totalAmountCents = Math.max(linesTotal + ctx.shippingCostCents, 0);
    const commissionAmountCents = Math.max(0, Math.trunc(ctx.commissionAmountCents));
    const platformRevenueCents = commissionAmountCents;
    const sellerPayoutCents = Math.max(totalAmountCents - platformRevenueCents, 0);

    return {
      ...ctx,
      subtotalAmountCents,
      discountAmountCents,
      taxAmountCents,
      totalAmountCents,
      commissionAmountCents,
      platformRevenueCents,
      sellerPayoutCents,
      breakdown: {
        ...ctx.breakdown,
        finalize: {
          subtotalAmountCents,
          discountAmountCents,
          taxAmountCents,
          commissionAmountCents,
          shippingCostCents: ctx.shippingCostCents,
          totalAmountCents,
          sellerPayoutCents,
          platformRevenueCents,
        },
      },
    };
  }
}
