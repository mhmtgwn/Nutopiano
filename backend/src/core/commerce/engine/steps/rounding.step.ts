import { CalculationStep, CalculationWorkingContext } from '../../contracts';

export class RoundingStep implements CalculationStep {
  readonly key = 'rounding';

  execute(ctx: CalculationWorkingContext): CalculationWorkingContext {
    const lines = ctx.lines.map((line) => ({
      ...line,
      grossBeforeDiscountCents: Math.trunc(line.grossBeforeDiscountCents),
      lineDiscountCents: Math.trunc(line.lineDiscountCents),
      orderDiscountShareCents: Math.trunc(line.orderDiscountShareCents),
      grossAfterDiscountCents: Math.trunc(line.grossAfterDiscountCents),
      netAfterDiscountCents: Math.trunc(line.netAfterDiscountCents),
      taxAmountCents: Math.trunc(line.taxAmountCents),
      lineTotalCents: Math.trunc(line.lineTotalCents),
    }));

    return {
      ...ctx,
      lines,
      breakdown: {
        ...ctx.breakdown,
        rounding: {
          mode: ctx.roundingMode,
        },
      },
    };
  }
}
