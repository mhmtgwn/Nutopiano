import { CalculationLine, CalculationStep, CalculationWorkingContext } from '../../contracts';
import { clamp, distributeProportionally, roundHalfUpDivide, toInt } from './math.util';

export class DiscountStep implements CalculationStep {
  readonly key = 'discount';

  execute(ctx: CalculationWorkingContext): CalculationWorkingContext {
    if (ctx.lines.length === 0) {
      return ctx;
    }

    const withLineDiscount = ctx.lines.map((line, index) => {
      const requested = toInt(ctx.items[index]?.discountAmountCents ?? 0, 0);
      const lineDiscountCents = clamp(requested, 0, line.grossBeforeDiscountCents);
      const grossAfterLine = line.grossBeforeDiscountCents - lineDiscountCents;

      return {
        ...line,
        lineDiscountCents,
        grossAfterDiscountCents: grossAfterLine,
      };
    });

    const totalAfterLineDiscount = withLineDiscount.reduce(
      (acc, line) => acc + line.grossAfterDiscountCents,
      0,
    );

    const requestedCartDiscountCents = toInt(ctx.cartDiscountAmountCents ?? 0, 0);
    const requestedRuleDiscountCents =
      ctx.orderDiscountRule?.type === 'PERCENT'
        ? roundHalfUpDivide(
            totalAfterLineDiscount * toInt(ctx.orderDiscountRule.value, 0),
            10_000,
          )
        : ctx.orderDiscountRule?.type === 'FIXED'
          ? toInt(ctx.orderDiscountRule.value, 0)
          : 0;

    const distributedDiscountCents = clamp(
      requestedCartDiscountCents + requestedRuleDiscountCents,
      0,
      totalAfterLineDiscount,
    );

    const distributedShares = distributeProportionally(
      distributedDiscountCents,
      withLineDiscount.map((line) => line.grossAfterDiscountCents),
    );

    const withOrderDiscount = withLineDiscount.map((line, index) => {
      const orderDiscountShareCents = clamp(
        distributedShares[index] ?? 0,
        0,
        line.grossAfterDiscountCents,
      );
      const grossAfterDiscountCents = Math.max(
        line.grossAfterDiscountCents - orderDiscountShareCents,
        0,
      );

      const next: CalculationLine = {
        ...line,
        orderDiscountShareCents,
        grossAfterDiscountCents,
      };
      return next;
    });

    const discountAmountCents = withOrderDiscount.reduce(
      (acc, line) => acc + line.lineDiscountCents + line.orderDiscountShareCents,
      0,
    );

    return {
      ...ctx,
      lines: withOrderDiscount,
      discountAmountCents,
      breakdown: {
        ...ctx.breakdown,
        discount: {
          cartDiscountRequestedCents: requestedCartDiscountCents,
          ruleDiscountRequestedCents: requestedRuleDiscountCents,
          distributedDiscountCents,
          lineDiscountTotalCents: withOrderDiscount.reduce(
            (acc, line) => acc + line.lineDiscountCents,
            0,
          ),
          discountAmountCents,
        },
      },
    };
  }
}
