import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  CatalogCheckoutSnapshot,
  CatalogProductSnapshot,
  CatalogReadPort,
  CatalogVariantSnapshot,
  CheckoutLineInput,
} from '../ports';

@Injectable()
export class PrismaCatalogReadService extends CatalogReadPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private extractIds(lines: CheckoutLineInput[]) {
    const productIds = Array.from(
      new Set(
        lines.map((line) => Number(line.productId)).filter((id) => id > 0),
      ),
    );
    const variantIds = Array.from(
      new Set(
        lines
          .map((line) => line.variantId)
          .filter((id): id is number => Number.isFinite(id) && Number(id) > 0),
      ),
    );

    return { productIds, variantIds };
  }

  private buildSnapshot(params: {
    products: CatalogProductSnapshot[];
    variants: CatalogVariantSnapshot[];
  }): CatalogCheckoutSnapshot {
    return {
      products: new Map(params.products.map((row) => [row.id, row])),
      variants: new Map(params.variants.map((row) => [row.id, row])),
    };
  }

  async getCheckoutSnapshot(params: {
    businessId: number;
    lines: CheckoutLineInput[];
    sellerId?: number | null;
  }): Promise<CatalogCheckoutSnapshot> {
    const { productIds, variantIds } = this.extractIds(params.lines);
    const businessId = Number(params.businessId);

    const products = await this.prisma.product.findMany({
      where: {
        businessId,
        id: { in: productIds },
        isActive: true,
        ...(typeof params.sellerId === 'number'
          ? { ownerSellerId: params.sellerId }
          : {}),
      },
      select: {
        id: true,
        categoryId: true,
        ownerSellerId: true,
        priceCents: true,
        costPriceCents: true,
        stock: true,
        name: true,
      },
    });

    const variants =
      variantIds.length > 0
        ? await (this.prisma as any).productVariant.findMany({
            where: {
              businessId,
              id: { in: variantIds },
              isActive: true,
            },
            select: {
              id: true,
              productId: true,
              priceCents: true,
              stock: true,
              name: true,
            },
          })
        : [];

    return this.buildSnapshot({
      products: products as CatalogProductSnapshot[],
      variants: variants as CatalogVariantSnapshot[],
    });
  }

  async lockCheckoutSnapshot(
    tx: Prisma.TransactionClient,
    params: {
      businessId: number;
      lines: CheckoutLineInput[];
      sellerId?: number | null;
    },
  ): Promise<CatalogCheckoutSnapshot> {
    const { productIds, variantIds } = this.extractIds(params.lines);
    const businessId = Number(params.businessId);
    const sellerId =
      typeof params.sellerId === 'number' && params.sellerId > 0
        ? Number(params.sellerId)
        : null;

    const products = await tx.$queryRaw<CatalogProductSnapshot[]>`
      SELECT
        id,
        "categoryId",
        "ownerSellerId",
        "priceCents",
        "costPriceCents",
        stock,
        name
      FROM "Product"
      WHERE "businessId" = ${businessId}
        AND id = ANY(${productIds}::int[])
        AND "isActive" = true
        ${sellerId ? Prisma.sql`AND "ownerSellerId" = ${sellerId}` : Prisma.empty}
      FOR UPDATE NOWAIT
    `;

    const variants =
      variantIds.length > 0
        ? await tx.$queryRaw<CatalogVariantSnapshot[]>`
          SELECT
            id,
            "productId",
            "priceCents",
            stock,
            name
          FROM "ProductVariant"
          WHERE "businessId" = ${businessId}
            AND id = ANY(${variantIds}::int[])
            AND "isActive" = true
          FOR UPDATE NOWAIT
        `
        : [];

    if (products.length !== productIds.length) {
      const productMap = new Map(products.map((row) => [row.id, row]));
      const missingId =
        productIds.find((productId) => !productMap.has(productId)) ??
        productIds[0];
      throw new NotFoundException(`Product not found: ${missingId}`);
    }

    return this.buildSnapshot({ products, variants });
  }
}
