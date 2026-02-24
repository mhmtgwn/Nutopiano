import { CommerceCalculationService } from '../commerce-calculation.service';

describe('CalculationEngine', () => {
  const service = new CommerceCalculationService();

  it('should be deterministic for same input', () => {
    const input = {
      channel: 'POS' as const,
      businessId: 1,
      sellerId: 42,
      currency: 'TRY',
      calculationProfileId: 'tr-default',
      taxInclusive: true,
      items: [
        {
          productId: 10,
          categoryId: 100,
          quantity: 2,
          unitPriceCents: 12_500,
          taxRateBps: 2_000,
          discountAmountCents: 250,
        },
        {
          productId: 20,
          categoryId: 200,
          quantity: 1,
          unitPriceCents: 8_000,
          taxRateBps: 800,
          discountAmountCents: 0,
        },
      ],
      cartDiscountAmountCents: 500,
      shippingCostCents: 1_000,
      commissionPolicy: { type: 'PERCENT' as const, value: 1_000 },
      categoryCommissionOverrides: [
        { categoryId: 200, type: 'PERCENT' as const, value: 500 },
      ],
    };

    const first = service.calculate(input);
    const second = service.calculate(input);

    expect(first).toEqual(second);
    expect(first.totalAmountCents).toBeGreaterThan(0);
    expect(first.calculationVersion.startsWith('v1:')).toBe(true);
  });

  it('should apply FIXED commission once per order and distribute it', () => {
    const result = service.calculate({
      channel: 'MARKETPLACE',
      businessId: 1,
      taxInclusive: true,
      items: [
        {
          productId: 10,
          quantity: 1,
          unitPriceCents: 1_000,
          taxRateBps: 0,
        },
        {
          productId: 20,
          quantity: 1,
          unitPriceCents: 3_000,
          taxRateBps: 0,
        },
      ],
      commissionPolicy: { type: 'FIXED', value: 1_000 },
    });

    expect(result.subtotalAmountCents).toBe(4_000);
    expect(result.commissionAmountCents).toBe(1_000);
    expect(result.sellerPayoutCents).toBe(3_000);
  });

  it('should apply order-level percent + cart discount together', () => {
    const result = service.calculate({
      channel: 'POS',
      businessId: 1,
      taxInclusive: true,
      items: [
        {
          productId: 10,
          quantity: 1,
          unitPriceCents: 10_000,
          taxRateBps: 0,
        },
        {
          productId: 20,
          quantity: 1,
          unitPriceCents: 5_000,
          taxRateBps: 0,
        },
      ],
      orderDiscountRule: { type: 'PERCENT', value: 1_000 },
      cartDiscountAmountCents: 500,
      commissionPolicy: { type: 'PERCENT', value: 0 },
    });

    expect(result.subtotalAmountCents).toBe(15_000);
    expect(result.discountAmountCents).toBe(2_000);
    expect(result.totalAmountCents).toBe(13_000);
    expect(result.breakdown.discount).toMatchObject({
      cartDiscountRequestedCents: 500,
      ruleDiscountRequestedCents: 1_500,
      distributedDiscountCents: 2_000,
    });
  });

  it('should reject unsupported TR tax rates', () => {
    expect(() =>
      service.calculate({
        channel: 'POS',
        businessId: 1,
        taxInclusive: true,
        items: [
          {
            productId: 10,
            quantity: 1,
            unitPriceCents: 1_000,
            taxRateBps: 700,
          },
        ],
      }),
    ).toThrow(RangeError);
  });
});
