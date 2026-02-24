import { CalculationLine, CalculationStep, CalculationWorkingContext } from '../../contracts';
import { roundHalfUpDivide, toInt } from './math.util';

const ALLOWED_TR_TAX_RATES_BPS = new Set([0, 100, 800, 2000]);

export class TaxStep implements CalculationStep {
  readonly key = 'tax';

  execute(ctx: CalculationWorkingContext): CalculationWorkingContext {
    const lines: CalculationLine[] = ctx.lines.map((line) => {
      const taxRateBps = toInt(line.taxRateBps ?? 0, 0);
      if (!ALLOWED_TR_TAX_RATES_BPS.has(taxRateBps)) {
        throw new RangeError(`Unsupported TR tax rate bps: ${taxRateBps}`);
      }

      if (taxRateBps <= 0) {
        return {
          ...line,
          taxRateBps: 0,
          netAfterDiscountCents: line.grossAfterDiscountCents,
          taxAmountCents: 0,
          lineTotalCents: line.grossAfterDiscountCents,
        };
      }

      if (ctx.taxInclusive) {
        const netAfterDiscountCents = roundHalfUpDivide(
          line.grossAfterDiscountCents * 10_000,
          10_000 + taxRateBps,
        );
        const taxAmountCents = Math.max(
          line.grossAfterDiscountCents - netAfterDiscountCents,
          0,
        );

        return {
          ...line,
          taxRateBps,
          netAfterDiscountCents,
          taxAmountCents,
          lineTotalCents: line.grossAfterDiscountCents,
        };
      }

      const taxAmountCents = roundHalfUpDivide(
        line.grossAfterDiscountCents * taxRateBps,
        10_000,
      );
      return {
        ...line,
        taxRateBps,
        netAfterDiscountCents: line.grossAfterDiscountCents,
        taxAmountCents,
        lineTotalCents: line.grossAfterDiscountCents + taxAmountCents,
      };
    });

    const taxAmountCents = lines.reduce((acc, line) => acc + line.taxAmountCents, 0);

    return {
      ...ctx,
      lines,
      taxAmountCents,
      breakdown: {
        ...ctx.breakdown,
        tax: {
          taxInclusive: ctx.taxInclusive,
          taxAmountCents,
          byRate: lines.reduce<Record<string, number>>((acc, line) => {
            const key = String(line.taxRateBps);
            acc[key] = (acc[key] ?? 0) + line.taxAmountCents;
            return acc;
          }, {}),
        },
      },
    };
  }
}
