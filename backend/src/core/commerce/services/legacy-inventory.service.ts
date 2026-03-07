import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CatalogCheckoutSnapshot,
  CheckoutLineInput,
  InventoryAdjustmentReason,
  InventoryPort,
} from '../ports';

@Injectable()
export class LegacyInventoryService extends InventoryPort {
  aggregateLines(lines: CheckoutLineInput[]) {
    const byProduct = new Map<number, number>();
    const byVariant = new Map<number, number>();

    for (const line of lines) {
      const quantity = Number(line.quantity) || 0;
      if (quantity <= 0) continue;
      if (line.variantId) {
        byVariant.set(
          line.variantId,
          (byVariant.get(line.variantId) ?? 0) + quantity,
        );
      } else {
        byProduct.set(
          line.productId,
          (byProduct.get(line.productId) ?? 0) + quantity,
        );
      }
    }

    return { byProduct, byVariant };
  }

  assertAvailability(
    snapshot: CatalogCheckoutSnapshot,
    lines: CheckoutLineInput[],
  ): void {
    for (const line of lines) {
      const product = snapshot.products.get(line.productId);
      if (!product) {
        throw new NotFoundException(`Product not found: ${line.productId}`);
      }

      if (line.variantId) {
        const variant = snapshot.variants.get(line.variantId);
        if (!variant || variant.productId !== line.productId) {
          throw new NotFoundException(
            `Product variant not found: ${line.variantId}`,
          );
        }
        if (
          variant.stock !== null &&
          variant.stock !== undefined &&
          variant.stock < line.quantity
        ) {
          throw new NotFoundException(
            `Insufficient stock for variant "${variant.name}". Available: ${variant.stock}, Requested: ${line.quantity}`,
          );
        }
        continue;
      }

      if (
        product.stock !== null &&
        product.stock !== undefined &&
        product.stock < line.quantity
      ) {
        throw new NotFoundException(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${line.quantity}`,
        );
      }
    }
  }

  async decrementStock(
    tx: Prisma.TransactionClient,
    snapshot: CatalogCheckoutSnapshot,
    lines: CheckoutLineInput[],
    reason: InventoryAdjustmentReason,
  ): Promise<void> {
    void reason;
    const aggregated = this.aggregateLines(lines);

    for (const [variantId, quantity] of aggregated.byVariant.entries()) {
      const variant = snapshot.variants.get(variantId);
      if (variant && variant.stock !== null && variant.stock !== undefined) {
        await tx.productVariant.update({
          where: { id: variantId },
          data: { stock: { decrement: quantity } },
        });
      }
    }

    for (const [productId, quantity] of aggregated.byProduct.entries()) {
      const product = snapshot.products.get(productId);
      if (product && product.stock !== null && product.stock !== undefined) {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { decrement: quantity } },
        });
      }
    }
  }

  async incrementStock(
    tx: Prisma.TransactionClient,
    lines: CheckoutLineInput[],
    reason: InventoryAdjustmentReason,
  ): Promise<void> {
    void reason;
    const aggregated = this.aggregateLines(lines);

    for (const [variantId, quantity] of aggregated.byVariant.entries()) {
      await tx.productVariant.updateMany({
        where: { id: variantId, stock: { not: null } },
        data: { stock: { increment: quantity } },
      });
    }

    for (const [productId, quantity] of aggregated.byProduct.entries()) {
      await tx.product.updateMany({
        where: { id: productId, stock: { not: null } },
        data: { stock: { increment: quantity } },
      });
    }
  }
}
