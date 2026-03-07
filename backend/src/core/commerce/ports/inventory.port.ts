import { Prisma } from '@prisma/client';
import {
  CatalogCheckoutSnapshot,
  CheckoutLineInput,
} from './catalog-read.port';

export type InventoryAdjustmentReason = 'sale' | 'cancel' | 'refund' | 'manual';

export abstract class InventoryPort {
  abstract aggregateLines(lines: CheckoutLineInput[]): {
    byProduct: Map<number, number>;
    byVariant: Map<number, number>;
  };

  abstract assertAvailability(
    snapshot: CatalogCheckoutSnapshot,
    lines: CheckoutLineInput[],
  ): void;

  abstract decrementStock(
    tx: Prisma.TransactionClient,
    snapshot: CatalogCheckoutSnapshot,
    lines: CheckoutLineInput[],
    reason: InventoryAdjustmentReason,
  ): Promise<void>;

  abstract incrementStock(
    tx: Prisma.TransactionClient,
    lines: CheckoutLineInput[],
    reason: InventoryAdjustmentReason,
  ): Promise<void>;
}
