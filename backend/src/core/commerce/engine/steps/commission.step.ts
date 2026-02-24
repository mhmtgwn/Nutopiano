import {
  CategoryCommissionOverride,
  CommissionPolicy,
  CalculationLine,
  CalculationStep,
  CalculationWorkingContext,
} from '../../contracts';
import { distributeProportionally, roundHalfUpDivide, toInt } from './math.util';

const findOverride = (
  overrides: CategoryCommissionOverride[] | undefined,
  line: CalculationLine,
): CategoryCommissionOverride | null => {
  if (!overrides || overrides.length === 0) return null;
  if (typeof line.categoryId !== 'number') return null;
  return overrides.find((item) => item.categoryId === line.categoryId) ?? null;
};

export class CommissionStep implements CalculationStep {
  readonly key = 'commission';

  execute(ctx: CalculationWorkingContext): CalculationWorkingContext {
    const fallbackPolicy: CommissionPolicy = ctx.commissionPolicy ?? {
      type: 'PERCENT',
      value: 0,
    };

    const directRows: Array<{
      productId: number;
      categoryId: number | null;
      baseAmountCents: number;
      policy: CommissionPolicy;
      commissionAmountCents: number;
    }> = [];

    const fallbackRows: Array<{
      productId: number;
      categoryId: number | null;
      baseAmountCents: number;
    }> = [];

    for (const line of ctx.lines) {
      const override = findOverride(ctx.categoryCommissionOverrides, line);
      const baseAmountCents = toInt(line.netAfterDiscountCents, 0);

      if (!override) {
        fallbackRows.push({
          productId: line.productId,
          categoryId: line.categoryId ?? null,
          baseAmountCents,
        });
        continue;
      }

      const policy: CommissionPolicy = {
        type: override.type,
        value: override.value,
      };
      const commissionAmountCents =
        policy.type === 'PERCENT'
          ? roundHalfUpDivide(baseAmountCents * toInt(policy.value, 0), 10_000)
          : toInt(policy.value, 0);

      directRows.push({
        productId: line.productId,
        categoryId: line.categoryId ?? null,
        baseAmountCents,
        policy,
        commissionAmountCents,
      });
    }

    let fallbackCommissionRows: Array<{
      productId: number;
      categoryId: number | null;
      baseAmountCents: number;
      policy: CommissionPolicy;
      commissionAmountCents: number;
    }> = [];

    if (fallbackRows.length > 0) {
      if (fallbackPolicy.type === 'PERCENT') {
        fallbackCommissionRows = fallbackRows.map((row) => ({
          ...row,
          policy: fallbackPolicy,
          commissionAmountCents: roundHalfUpDivide(
            row.baseAmountCents * toInt(fallbackPolicy.value, 0),
            10_000,
          ),
        }));
      } else {
        const fallbackFixedTotal = toInt(fallbackPolicy.value, 0);
        const allocations = distributeProportionally(
          fallbackFixedTotal,
          fallbackRows.map((row) => row.baseAmountCents),
        );
        fallbackCommissionRows = fallbackRows.map((row, index) => ({
          ...row,
          policy: fallbackPolicy,
          commissionAmountCents: allocations[index] ?? 0,
        }));
      }
    }

    const perLine = [...directRows, ...fallbackCommissionRows];

    const commissionAmountCents = perLine.reduce(
      (acc, row) => acc + row.commissionAmountCents,
      0,
    );

    return {
      ...ctx,
      commissionAmountCents,
      breakdown: {
        ...ctx.breakdown,
        commission: {
          totalCommissionAmountCents: commissionAmountCents,
          perLine,
        },
      },
    };
  }
}
