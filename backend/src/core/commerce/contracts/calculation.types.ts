export type CalculationChannel = 'MARKETPLACE' | 'POS' | 'MANUAL';
export type CurrencyCode = 'TRY' | string;
export type RoundingMode = 'HALF_UP';

export type DiscountRuleType = 'PERCENT' | 'FIXED';
export type CommissionRuleType = 'PERCENT' | 'FIXED';

export interface CalculationItemInput {
  productId: number;
  variantId?: number | null;
  categoryId?: number | null;
  quantity: number;
  unitPriceCents: number;
  discountAmountCents?: number;
  taxRateBps?: number;
}

export interface OrderDiscountRule {
  type: DiscountRuleType;
  value: number;
}

export interface CommissionPolicy {
  type: CommissionRuleType;
  value: number;
}

export interface CategoryCommissionOverride {
  categoryId: number;
  type: CommissionRuleType;
  value: number;
}

export interface CalculationRequestContext {
  channel: CalculationChannel;
  businessId: number;
  sellerId?: number | null;
  currency?: CurrencyCode;
  items: CalculationItemInput[];
  cartDiscountAmountCents?: number;
  shippingCostCents?: number;
  orderDiscountRule?: OrderDiscountRule | null;
  commissionPolicy?: CommissionPolicy | null;
  categoryCommissionOverrides?: CategoryCommissionOverride[];
  calculationProfileId?: string | null;
  idempotencyKey?: string;
  taxInclusive?: boolean;
  roundingMode?: RoundingMode;
}

export interface CalculationLine {
  index: number;
  productId: number;
  variantId?: number | null;
  categoryId?: number | null;
  quantity: number;
  unitPriceCents: number;
  taxRateBps: number;
  grossBeforeDiscountCents: number;
  lineDiscountCents: number;
  orderDiscountShareCents: number;
  grossAfterDiscountCents: number;
  netAfterDiscountCents: number;
  taxAmountCents: number;
  lineTotalCents: number;
}

export interface CalculationWorkingContext
  extends Omit<CalculationRequestContext, 'currency' | 'roundingMode'> {
  currency: CurrencyCode;
  roundingMode: RoundingMode;
  taxInclusive: boolean;
  shippingCostCents: number;
  lines: CalculationLine[];
  subtotalAmountCents: number;
  discountAmountCents: number;
  taxAmountCents: number;
  commissionAmountCents: number;
  totalAmountCents: number;
  sellerPayoutCents: number;
  platformRevenueCents: number;
  breakdown: Record<string, unknown>;
  calculationVersion: string;
}

export interface CalculationResult {
  channel: CalculationChannel;
  businessId: number;
  sellerId?: number | null;
  currency: CurrencyCode;
  subtotalAmountCents: number;
  discountAmountCents: number;
  taxAmountCents: number;
  commissionAmountCents: number;
  shippingCostCents: number;
  totalAmountCents: number;
  sellerPayoutCents: number;
  platformRevenueCents: number;
  calculationProfileId: string | null;
  calculationVersion: string;
  breakdown: Record<string, unknown>;
  lines: CalculationLine[];
}

export interface CalculationVersionSeed {
  stepOrder: string[];
  ruleProfileId: string;
  commissionRuleSnapshot: unknown;
  taxProfile: unknown;
  roundingPolicy: RoundingMode;
  discountRules: unknown;
}

export interface CalculationStep {
  key: string;
  execute(ctx: CalculationWorkingContext): CalculationWorkingContext;
}
