import { CalculationLine, CalculationStep, CalculationWorkingContext } from '../../contracts';

export class PricingStep implements CalculationStep {
  readonly key = 'pricing';

  execute(ctx: CalculationWorkingContext): CalculationWorkingContext {
    const lines: CalculationLine[] = ctx.items.map((item, index) => {
      const quantity = Math.max(1, Math.trunc(Number(item.quantity)));
      const unitPriceCents = Math.max(0, Math.trunc(Number(item.unitPriceCents)));
      const grossBeforeDiscountCents = quantity * unitPriceCents;
      const taxRateBps = Math.max(0, Math.trunc(Number(item.taxRateBps ?? 0)));

      return {
        index,
        productId: item.productId,
        variantId: item.variantId ?? null,
        categoryId: item.categoryId ?? null,
        quantity,
        unitPriceCents,
        taxRateBps,
        grossBeforeDiscountCents,
        lineDiscountCents: 0,
        orderDiscountShareCents: 0,
        grossAfterDiscountCents: grossBeforeDiscountCents,
        netAfterDiscountCents: grossBeforeDiscountCents,
        taxAmountCents: 0,
        lineTotalCents: grossBeforeDiscountCents,
      };
    });

    const subtotalAmountCents = lines.reduce(
      (acc, line) => acc + line.grossBeforeDiscountCents,
      0,
    );

    return {
      ...ctx,
      lines,
      subtotalAmountCents,
      breakdown: {
        ...ctx.breakdown,
        pricing: {
          lines: lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            categoryId: line.categoryId,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            grossBeforeDiscountCents: line.grossBeforeDiscountCents,
          })),
          subtotalAmountCents,
        },
      },
    };
  }
}
