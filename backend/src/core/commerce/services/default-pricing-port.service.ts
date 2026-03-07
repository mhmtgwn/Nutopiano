import { Injectable } from '@nestjs/common';
import { CalculationVersionSeed } from '../contracts';
import { buildCalculationVersion } from '../engine';
import {
  PricingPort,
  StandardPricingRequest,
  StandardPricingResult,
} from '../ports';

@Injectable()
export class DefaultPricingPortService extends PricingPort {
  private toInt(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(Math.trunc(parsed), 0);
  }

  calculateOrderPricing(
    request: StandardPricingRequest,
  ): StandardPricingResult {
    let subtotalAmountCents = 0;
    let taxAmountCents = 0;
    let lineDiscountAmountCents = 0;
    let runningTotalAmountCents = 0;

    const lines = request.lines.map((line) => {
      const lineSubtotalRaw =
        this.toInt(line.unitPriceCents) * this.toInt(line.quantity);
      const requestedLineDiscount = this.toInt(line.discountAmountCents ?? 0);
      const lineDiscount = Math.min(requestedLineDiscount, lineSubtotalRaw);
      const subtotalAmount = lineSubtotalRaw - lineDiscount;
      const taxRateBps = this.toInt(line.taxRateBps ?? 0);
      const taxAmount = Math.round((subtotalAmount * taxRateBps) / 10_000);
      const totalAmount = subtotalAmount + taxAmount;

      subtotalAmountCents += subtotalAmount;
      taxAmountCents += taxAmount;
      lineDiscountAmountCents += lineDiscount;
      runningTotalAmountCents += totalAmount;

      return {
        productId: line.productId,
        variantId: line.variantId ?? null,
        productName: line.productName,
        quantity: this.toInt(line.quantity),
        unitPriceCents: this.toInt(line.unitPriceCents),
        subtotalAmountCents: subtotalAmount,
        taxAmountCents: taxAmount,
        taxRateBps,
        totalAmountCents: totalAmount,
        costSnapshotCents: this.toInt(line.costSnapshotCents),
      };
    });

    const cartDiscountAmountCents = Math.min(
      this.toInt(request.cartDiscountAmountCents ?? 0),
      runningTotalAmountCents,
    );
    runningTotalAmountCents -= cartDiscountAmountCents;

    const couponDiscountAmountCents = Math.min(
      this.toInt(request.couponDiscountAmountCents ?? 0),
      runningTotalAmountCents,
    );
    runningTotalAmountCents -= couponDiscountAmountCents;

    const shippingCostCents = this.toInt(request.shippingCostCents ?? 0);
    const discountAmountCents =
      lineDiscountAmountCents +
      cartDiscountAmountCents +
      couponDiscountAmountCents;

    const commissionPolicy = request.commissionPolicy ?? {
      type: 'PERCENT',
      value: 0,
    };
    const commissionSnapshotCents = Math.max(
      0,
      commissionPolicy.type === 'FIXED'
        ? Math.min(this.toInt(commissionPolicy.value), runningTotalAmountCents)
        : Math.round(
            (runningTotalAmountCents * this.toInt(commissionPolicy.value)) /
              10_000,
          ),
    );
    const platformRevenueCents = commissionSnapshotCents;
    const sellerPayoutCents = Math.max(
      runningTotalAmountCents - platformRevenueCents,
      0,
    );

    const calculationSeed: CalculationVersionSeed = {
      stepOrder: ['pricing', 'discount', 'tax', 'commission', 'finalize'],
      ruleProfileId: request.calculationProfileId ?? 'default',
      commissionRuleSnapshot: commissionPolicy,
      taxProfile: {
        inclusive: request.taxInclusive ?? false,
        code: request.breakdownContext?.taxProfileCode ?? null,
        rates: request.lines.map((line) => this.toInt(line.taxRateBps ?? 0)),
      },
      roundingPolicy: 'HALF_UP',
      discountRules: {
        lineDiscountTotalCents: lineDiscountAmountCents,
        cartDiscountAmountCents,
        couponDiscountAmountCents,
        couponCode: request.couponCode ?? null,
      },
    };
    const calculationVersion = buildCalculationVersion(calculationSeed);

    return {
      subtotalAmountCents,
      taxAmountCents,
      discountAmountCents,
      shippingCostCents,
      totalAmountCents: runningTotalAmountCents,
      commissionSnapshotCents,
      platformRevenueCents,
      sellerPayoutCents,
      calculationVersion,
      breakdownJson: {
        source: request.breakdownContext?.source ?? 'pricing-port',
        pricing: {
          subtotalAmountCents,
          shippingCostCents,
        },
        discount: {
          lineDiscountAmountCents,
          cartDiscountAmountCents,
          couponDiscountAmountCents,
          discountAmountCents,
        },
        tax: {
          taxAmountCents,
          taxRates: request.lines.map((line) =>
            this.toInt(line.taxRateBps ?? 0),
          ),
        },
        commission: {
          policyType: commissionPolicy.type,
          policyValue: commissionPolicy.value,
          commissionSnapshotCents,
        },
        payout: {
          platformRevenueCents,
          sellerPayoutCents,
        },
        ruleResolution: {
          source: request.breakdownContext?.ruleResolutionSource ?? null,
          commissionProfileCode:
            request.breakdownContext?.commissionProfileCode ?? null,
          taxProfileCode: request.breakdownContext?.taxProfileCode ?? null,
        },
        coupon: {
          code: request.couponCode ?? null,
          discountAmountCents: couponDiscountAmountCents,
        },
        calculationVersionSeed: calculationSeed,
      },
      lines,
    };
  }
}
