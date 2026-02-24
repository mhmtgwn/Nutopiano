import { CalculationStep, CalculationWorkingContext } from '../../contracts';

export class DeliveryStep implements CalculationStep {
  readonly key = 'delivery';

  execute(ctx: CalculationWorkingContext): CalculationWorkingContext {
    const shippingCostCents = Math.max(0, Math.trunc(Number(ctx.shippingCostCents ?? 0)));

    return {
      ...ctx,
      shippingCostCents,
      breakdown: {
        ...ctx.breakdown,
        delivery: {
          shippingCostCents,
        },
      },
    };
  }
}
