import { BadRequestException, Injectable } from '@nestjs/common';
import {
  FinanceLedgerAccountType,
  FinanceLedgerDirection,
  FinanceLedgerEventType,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma.service';

interface OrderSalePostingParams {
  businessId: number;
  orderId: number;
  sellerId?: number | null;
  currency: string;
  totalAmountCents: number;
  sellerPayoutCents: number;
  platformRevenueCents: number;
  metadata?: Prisma.InputJsonValue;
}

interface LedgerPostingResult {
  eventId: string;
  entryCount: number;
}

interface ReleaseOrderFundsParams {
  businessId: number;
  orderId: number;
  sellerId: number;
  currency: string;
  sellerPayoutCents: number;
  platformRevenueCents: number;
  metadata?: Prisma.InputJsonValue;
}

interface PayoutPaidPostingParams {
  businessId: number;
  payoutRequestId: number;
  sellerId: number;
  currency: string;
  amountCents: number;
  metadata?: Prisma.InputJsonValue;
}

interface OrderRefundPostingParams {
  businessId: number;
  orderId: number;
  sellerId?: number | null;
  currency: string;
  totalAmountCents: number;
  sellerPayoutCents: number;
  platformRevenueCents: number;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class LedgerPostingService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeAmount(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(Math.trunc(parsed), 0);
  }

  private assertBalancedEntries(
    entries: Array<{ direction: FinanceLedgerDirection; amountCents: number }>,
  ) {
    const debit = entries.reduce(
      (acc, entry) =>
        entry.direction === FinanceLedgerDirection.DEBIT
          ? acc + entry.amountCents
          : acc,
      0,
    );
    const credit = entries.reduce(
      (acc, entry) =>
        entry.direction === FinanceLedgerDirection.CREDIT
          ? acc + entry.amountCents
          : acc,
      0,
    );

    if (debit !== credit) {
      throw new BadRequestException(
        `Ledger invariant failed: debit=${debit}, credit=${credit}`,
      );
    }
  }

  async assertEventInvariant(
    businessId: number,
    eventId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    const rows = await client.financeLedgerEntry.findMany({
      where: { businessId, eventId },
      select: {
        direction: true,
        amountCents: true,
      },
    });

    this.assertBalancedEntries(rows);
  }

  async postOrderSaleSnapshot(
    params: OrderSalePostingParams,
    tx?: Prisma.TransactionClient,
  ): Promise<LedgerPostingResult> {
    const executor = async (
      client: Prisma.TransactionClient,
    ): Promise<LedgerPostingResult> => {
      const businessId = Number(params.businessId);
      const orderId = Number(params.orderId);
      const sellerId =
        typeof params.sellerId === 'number' && Number.isFinite(params.sellerId)
          ? Math.trunc(params.sellerId)
          : null;
      const currency = String(params.currency ?? 'TRY').trim().toUpperCase() || 'TRY';
      const totalAmountCents = this.normalizeAmount(params.totalAmountCents);
      const sellerPayoutCents = this.normalizeAmount(params.sellerPayoutCents);
      const platformRevenueCents = this.normalizeAmount(params.platformRevenueCents);

      if (!Number.isFinite(businessId) || businessId <= 0) {
        throw new BadRequestException('businessId is invalid');
      }
      if (!Number.isFinite(orderId) || orderId <= 0) {
        throw new BadRequestException('orderId is invalid');
      }
      if (sellerPayoutCents + platformRevenueCents !== totalAmountCents) {
        throw new BadRequestException(
          'Snapshot payout/revenue does not match order total',
        );
      }

      const eventId = randomUUID();
      const entries: Array<{
        accountType: FinanceLedgerAccountType;
        direction: FinanceLedgerDirection;
        amountCents: number;
        sellerId?: number | null;
      }> = [
        {
          accountType: FinanceLedgerAccountType.CLEARING,
          direction: FinanceLedgerDirection.DEBIT,
          amountCents: totalAmountCents,
          sellerId: null,
        },
      ];

      if (platformRevenueCents > 0) {
        entries.push({
          accountType: FinanceLedgerAccountType.PLATFORM_REVENUE,
          direction: FinanceLedgerDirection.CREDIT,
          amountCents: platformRevenueCents,
          sellerId: null,
        });
      }

      if (sellerPayoutCents > 0) {
        if (sellerId) {
          entries.push({
            accountType: FinanceLedgerAccountType.SELLER_PENDING,
            direction: FinanceLedgerDirection.CREDIT,
            amountCents: sellerPayoutCents,
            sellerId,
          });
        } else {
          entries.push({
            accountType: FinanceLedgerAccountType.PLATFORM_PENDING,
            direction: FinanceLedgerDirection.CREDIT,
            amountCents: sellerPayoutCents,
            sellerId: null,
          });
        }
      }

      this.assertBalancedEntries(entries);

      await client.financeLedgerEntry.createMany({
        data: entries.map((entry) => ({
          businessId,
          eventId,
          eventType: FinanceLedgerEventType.ORDER_SALE,
          accountType: entry.accountType,
          direction: entry.direction,
          amountCents: entry.amountCents,
          currency,
          orderId,
          sellerId: entry.sellerId ?? null,
          metadata: params.metadata,
        })),
      });

      if (sellerId && sellerPayoutCents > 0) {
        await client.sellerWallet.upsert({
          where: {
            businessId_sellerId_currency: {
              businessId,
              sellerId,
              currency,
            },
          },
          update: {
            pendingBalanceCents: { increment: sellerPayoutCents },
          },
          create: {
            businessId,
            sellerId,
            currency,
            pendingBalanceCents: sellerPayoutCents,
            availableBalanceCents: 0,
          },
        });
      }

      const platformPendingIncrement =
        platformRevenueCents + (sellerId ? 0 : sellerPayoutCents);
      if (platformPendingIncrement > 0) {
        await client.platformWallet.upsert({
          where: {
            businessId_currency: {
              businessId,
              currency,
            },
          },
          update: {
            pendingBalanceCents: { increment: platformPendingIncrement },
          },
          create: {
            businessId,
            currency,
            pendingBalanceCents: platformPendingIncrement,
            availableBalanceCents: 0,
            reserveBalanceCents: 0,
          },
        });
      }

      await this.assertEventInvariant(businessId, eventId, client);

      return {
        eventId,
        entryCount: entries.length,
      };
    };

    if (tx) {
      return executor(tx);
    }

    return this.prisma.$transaction((client) => executor(client));
  }

  async postPendingToAvailableRelease(
    params: ReleaseOrderFundsParams,
    tx?: Prisma.TransactionClient,
  ): Promise<LedgerPostingResult> {
    const executor = async (
      client: Prisma.TransactionClient,
    ): Promise<LedgerPostingResult> => {
      const businessId = Number(params.businessId);
      const orderId = Number(params.orderId);
      const sellerId = Number(params.sellerId);
      const currency = String(params.currency ?? 'TRY').trim().toUpperCase() || 'TRY';
      const sellerPayoutCents = this.normalizeAmount(params.sellerPayoutCents);
      const platformRevenueCents = this.normalizeAmount(params.platformRevenueCents);

      if (!Number.isFinite(sellerId) || sellerId <= 0) {
        throw new BadRequestException('sellerId is invalid for release');
      }

      const eventId = randomUUID();
      const entries = [
        {
          accountType: FinanceLedgerAccountType.SELLER_PENDING,
          direction: FinanceLedgerDirection.DEBIT,
          amountCents: sellerPayoutCents,
          sellerId,
        },
        {
          accountType: FinanceLedgerAccountType.SELLER_AVAILABLE,
          direction: FinanceLedgerDirection.CREDIT,
          amountCents: sellerPayoutCents,
          sellerId,
        },
        {
          accountType: FinanceLedgerAccountType.PLATFORM_PENDING,
          direction: FinanceLedgerDirection.DEBIT,
          amountCents: platformRevenueCents,
          sellerId: null,
        },
        {
          accountType: FinanceLedgerAccountType.PLATFORM_AVAILABLE,
          direction: FinanceLedgerDirection.CREDIT,
          amountCents: platformRevenueCents,
          sellerId: null,
        },
      ].filter((entry) => entry.amountCents > 0);

      this.assertBalancedEntries(entries);

      await client.financeLedgerEntry.createMany({
        data: entries.map((entry) => ({
          businessId,
          eventId,
          eventType: FinanceLedgerEventType.RELEASE_AVAILABLE,
          accountType: entry.accountType,
          direction: entry.direction,
          amountCents: entry.amountCents,
          currency,
          orderId,
          sellerId: entry.sellerId,
          metadata: params.metadata,
        })),
      });

      await client.sellerWallet.updateMany({
        where: {
          businessId,
          sellerId,
          currency,
          pendingBalanceCents: { gte: sellerPayoutCents },
        },
        data: {
          pendingBalanceCents: { decrement: sellerPayoutCents },
          availableBalanceCents: { increment: sellerPayoutCents },
        },
      });

      await client.platformWallet.updateMany({
        where: {
          businessId,
          currency,
          pendingBalanceCents: { gte: platformRevenueCents },
        },
        data: {
          pendingBalanceCents: { decrement: platformRevenueCents },
          availableBalanceCents: { increment: platformRevenueCents },
        },
      });

      await this.assertEventInvariant(businessId, eventId, client);
      return { eventId, entryCount: entries.length };
    };

    if (tx) {
      return executor(tx);
    }

    return this.prisma.$transaction((client) => executor(client));
  }

  async postPayoutPaid(
    params: PayoutPaidPostingParams,
    tx?: Prisma.TransactionClient,
  ): Promise<LedgerPostingResult> {
    const executor = async (
      client: Prisma.TransactionClient,
    ): Promise<LedgerPostingResult> => {
      const businessId = Number(params.businessId);
      const payoutRequestId = Number(params.payoutRequestId);
      const sellerId = Number(params.sellerId);
      const amountCents = this.normalizeAmount(params.amountCents);
      const currency = String(params.currency ?? 'TRY').trim().toUpperCase() || 'TRY';

      const eventId = randomUUID();
      const entries = [
        {
          accountType: FinanceLedgerAccountType.SELLER_AVAILABLE,
          direction: FinanceLedgerDirection.DEBIT,
          amountCents,
          sellerId,
        },
        {
          accountType: FinanceLedgerAccountType.CLEARING,
          direction: FinanceLedgerDirection.CREDIT,
          amountCents,
          sellerId: null,
        },
      ];

      this.assertBalancedEntries(entries);

      const walletUpdate = await client.sellerWallet.updateMany({
        where: {
          businessId,
          sellerId,
          currency,
          availableBalanceCents: { gte: amountCents },
        },
        data: {
          availableBalanceCents: { decrement: amountCents },
        },
      });
      if (walletUpdate.count === 0) {
        throw new BadRequestException(
          'Insufficient seller available balance for payout',
        );
      }

      await client.financeLedgerEntry.createMany({
        data: entries.map((entry) => ({
          businessId,
          eventId,
          eventType: FinanceLedgerEventType.PAYOUT_PAID,
          accountType: entry.accountType,
          direction: entry.direction,
          amountCents: entry.amountCents,
          currency,
          sellerId: entry.sellerId,
          payoutRequestId,
          metadata: params.metadata,
        })),
      });

      await this.assertEventInvariant(businessId, eventId, client);
      return { eventId, entryCount: entries.length };
    };

    if (tx) {
      return executor(tx);
    }

    return this.prisma.$transaction((client) => executor(client));
  }

  async postOrderRefund(
    params: OrderRefundPostingParams,
    tx?: Prisma.TransactionClient,
  ): Promise<
    LedgerPostingResult & {
      sellerWalletNegativeAfter: boolean;
      platformWalletNegativeAfter: boolean;
    }
  > {
    const executor = async (client: Prisma.TransactionClient) => {
      const businessId = Number(params.businessId);
      const orderId = Number(params.orderId);
      const sellerId =
        typeof params.sellerId === 'number' && Number.isFinite(params.sellerId)
          ? Math.trunc(params.sellerId)
          : null;
      const currency = String(params.currency ?? 'TRY').trim().toUpperCase() || 'TRY';
      const totalAmountCents = this.normalizeAmount(params.totalAmountCents);
      const sellerPayoutCents = this.normalizeAmount(params.sellerPayoutCents);
      const platformRevenueCents = this.normalizeAmount(params.platformRevenueCents);

      if (sellerPayoutCents + platformRevenueCents !== totalAmountCents) {
        throw new BadRequestException(
          'Refund snapshot payout/revenue does not match order total',
        );
      }

      const eventId = randomUUID();
      const entries: Array<{
        accountType: FinanceLedgerAccountType;
        direction: FinanceLedgerDirection;
        amountCents: number;
        sellerId?: number | null;
      }> = [];

      let sellerWalletNegativeAfter = false;
      if (sellerId && sellerPayoutCents > 0) {
        const sellerWallet = await client.sellerWallet.upsert({
          where: {
            businessId_sellerId_currency: {
              businessId,
              sellerId,
              currency,
            },
          },
          update: {},
          create: {
            businessId,
            sellerId,
            currency,
            pendingBalanceCents: 0,
            availableBalanceCents: 0,
          },
          select: {
            id: true,
            pendingBalanceCents: true,
            availableBalanceCents: true,
          },
        });

        const pendingBefore = Number(sellerWallet.pendingBalanceCents ?? 0);
        const availableBefore = Number(sellerWallet.availableBalanceCents ?? 0);
        const debitPending = Math.min(Math.max(pendingBefore, 0), sellerPayoutCents);
        const debitAvailable = sellerPayoutCents - debitPending;
        const pendingAfter = pendingBefore - debitPending;
        const availableAfter = availableBefore - debitAvailable;
        sellerWalletNegativeAfter = availableAfter < 0;

        await client.sellerWallet.update({
          where: { id: sellerWallet.id },
          data: {
            pendingBalanceCents: pendingAfter,
            availableBalanceCents: availableAfter,
          },
        });

        if (debitPending > 0) {
          entries.push({
            accountType: FinanceLedgerAccountType.SELLER_PENDING,
            direction: FinanceLedgerDirection.DEBIT,
            amountCents: debitPending,
            sellerId,
          });
        }
        if (debitAvailable > 0) {
          entries.push({
            accountType: FinanceLedgerAccountType.SELLER_AVAILABLE,
            direction: FinanceLedgerDirection.DEBIT,
            amountCents: debitAvailable,
            sellerId,
          });
        }
      }

      const platformWallet = await client.platformWallet.upsert({
        where: {
          businessId_currency: {
            businessId,
            currency,
          },
        },
        update: {},
        create: {
          businessId,
          currency,
          pendingBalanceCents: 0,
          availableBalanceCents: 0,
          reserveBalanceCents: 0,
        },
        select: {
          id: true,
          pendingBalanceCents: true,
          availableBalanceCents: true,
        },
      });

      const platformPendingBefore = Number(platformWallet.pendingBalanceCents ?? 0);
      const platformAvailableBefore = Number(
        platformWallet.availableBalanceCents ?? 0,
      );
      const platformDebitPending = Math.min(
        Math.max(platformPendingBefore, 0),
        platformRevenueCents,
      );
      const platformDebitAvailable = platformRevenueCents - platformDebitPending;
      const platformPendingAfter = platformPendingBefore - platformDebitPending;
      const platformAvailableAfter = platformAvailableBefore - platformDebitAvailable;
      const platformWalletNegativeAfter = platformAvailableAfter < 0;

      await client.platformWallet.update({
        where: { id: platformWallet.id },
        data: {
          pendingBalanceCents: platformPendingAfter,
          availableBalanceCents: platformAvailableAfter,
        },
      });

      if (platformDebitPending > 0) {
        entries.push({
          accountType: FinanceLedgerAccountType.PLATFORM_PENDING,
          direction: FinanceLedgerDirection.DEBIT,
          amountCents: platformDebitPending,
          sellerId: null,
        });
      }
      if (platformDebitAvailable > 0) {
        entries.push({
          accountType: FinanceLedgerAccountType.PLATFORM_AVAILABLE,
          direction: FinanceLedgerDirection.DEBIT,
          amountCents: platformDebitAvailable,
          sellerId: null,
        });
      }

      entries.push({
        accountType: FinanceLedgerAccountType.CLEARING,
        direction: FinanceLedgerDirection.CREDIT,
        amountCents: totalAmountCents,
        sellerId: null,
      });

      this.assertBalancedEntries(entries);

      await client.financeLedgerEntry.createMany({
        data: entries.map((entry) => ({
          businessId,
          eventId,
          eventType: FinanceLedgerEventType.ORDER_REFUND,
          accountType: entry.accountType,
          direction: entry.direction,
          amountCents: entry.amountCents,
          currency,
          orderId,
          sellerId: entry.sellerId ?? null,
          metadata: params.metadata,
        })),
      });

      await this.assertEventInvariant(businessId, eventId, client);

      return {
        eventId,
        entryCount: entries.length,
        sellerWalletNegativeAfter,
        platformWalletNegativeAfter,
      };
    };

    if (tx) {
      return executor(tx);
    }

    return this.prisma.$transaction((client) => executor(client));
  }
}
