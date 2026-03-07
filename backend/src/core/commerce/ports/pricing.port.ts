import {
  CalculationChannel,
  CommissionPolicy,
  OrderDiscountRule,
} from '../contracts';

export type PricingLineInput = {
  productId: number;
  variantId?: number | null;
  categoryId?: number | null;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  costSnapshotCents: number;
  discountAmountCents?: number;
  taxRateBps?: number;
};

export type PricingBreakdownContext = {
  source: string;
  commissionProfileCode?: string | null;
  taxProfileCode?: string | null;
  couponCode?: string | null;
  couponDiscountAmountCents?: number;
  ruleResolutionSource?: string | null;
};

export type StandardPricingRequest = {
  channel: CalculationChannel;
  businessId: number;
  sellerId?: number | null;
  currency?: string;
  lines: PricingLineInput[];
  cartDiscountAmountCents?: number;
  couponDiscountAmountCents?: number;
  couponCode?: string | null;
  shippingCostCents?: number;
  orderDiscountRule?: OrderDiscountRule | null;
  commissionPolicy?: CommissionPolicy | null;
  calculationProfileId?: string | null;
  taxInclusive?: boolean;
  breakdownContext?: PricingBreakdownContext;
};

export type StandardPricingLineResult = {
  productId: number;
  variantId?: number | null;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  subtotalAmountCents: number;
  taxAmountCents: number;
  taxRateBps: number;
  totalAmountCents: number;
  costSnapshotCents: number;
};

export type StandardPricingResult = {
  subtotalAmountCents: number;
  taxAmountCents: number;
  discountAmountCents: number;
  shippingCostCents: number;
  totalAmountCents: number;
  commissionSnapshotCents: number;
  platformRevenueCents: number;
  sellerPayoutCents: number;
  calculationVersion: string;
  breakdownJson: Record<string, unknown>;
  lines: StandardPricingLineResult[];
};

export abstract class PricingPort {
  abstract calculateOrderPricing(
    request: StandardPricingRequest,
  ): StandardPricingResult;
}
