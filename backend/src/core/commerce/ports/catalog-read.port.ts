import { Prisma } from '@prisma/client';

export type CheckoutLineInput = {
  productId: number;
  variantId?: number | null;
  quantity: number;
};

export type CatalogProductSnapshot = {
  id: number;
  categoryId: number;
  ownerSellerId: number | null;
  priceCents: number;
  costPriceCents: number;
  stock: number | null;
  name: string;
};

export type CatalogVariantSnapshot = {
  id: number;
  productId: number;
  priceCents: number;
  stock: number | null;
  name: string;
};

export type CatalogCheckoutSnapshot = {
  products: Map<number, CatalogProductSnapshot>;
  variants: Map<number, CatalogVariantSnapshot>;
};

export abstract class CatalogReadPort {
  abstract getCheckoutSnapshot(params: {
    businessId: number;
    lines: CheckoutLineInput[];
    sellerId?: number | null;
  }): Promise<CatalogCheckoutSnapshot>;

  abstract lockCheckoutSnapshot(
    tx: Prisma.TransactionClient,
    params: {
      businessId: number;
      lines: CheckoutLineInput[];
      sellerId?: number | null;
    },
  ): Promise<CatalogCheckoutSnapshot>;
}
