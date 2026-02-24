import { buildCalculationVersion, canonicalStringify } from './calculation-version.util';

describe('calculation-version.util', () => {
  it('canonicalStringify should keep object key order deterministic', () => {
    const left = {
      b: 2,
      a: 1,
      nested: {
        z: true,
        x: false,
      },
    };
    const right = {
      nested: {
        x: false,
        z: true,
      },
      a: 1,
      b: 2,
    };

    expect(canonicalStringify(left)).toBe(canonicalStringify(right));
  });

  it('buildCalculationVersion should produce same digest for equal semantic payload', () => {
    const left = buildCalculationVersion({
      stepOrder: ['pricing', 'discount', 'tax', 'finalize'],
      ruleProfileId: 'tr-default',
      commissionRuleSnapshot: { type: 'PERCENT', value: 1200 },
      taxProfile: { inclusive: true, rates: [2000, 800, 100] },
      roundingPolicy: 'HALF_UP',
      discountRules: {
        lineDiscounts: [0, 500],
        cartDiscountAmountCents: 300,
        orderDiscountRule: null,
      },
    });

    const right = buildCalculationVersion({
      stepOrder: ['pricing', 'discount', 'tax', 'finalize'],
      ruleProfileId: 'tr-default',
      commissionRuleSnapshot: { value: 1200, type: 'PERCENT' },
      taxProfile: { rates: [2000, 800, 100], inclusive: true },
      roundingPolicy: 'HALF_UP',
      discountRules: {
        orderDiscountRule: null,
        cartDiscountAmountCents: 300,
        lineDiscounts: [0, 500],
      },
    });

    expect(left).toBe(right);
    expect(left.startsWith('v1:')).toBe(true);
  });
});
