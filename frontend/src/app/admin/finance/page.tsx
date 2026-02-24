'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatDateTime, formatPrice } from '@/lib/format';

type ViewKey = 'overview' | 'ledger' | 'wallets' | 'refunds' | 'mismatch';

type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type FinanceHealth = {
  lastCheckedAt: string;
  ledgerInvariant: {
    ok: boolean;
    imbalanceEventCount: number;
  };
  walletHealth: {
    negativeSellerWalletCount: number;
    negativePlatformWalletCount: number;
  };
  risk: {
    mismatchCount24h: number;
    totalOrders24h: number;
    mismatchRate24h: number;
  };
  payouts: {
    payoutAgingDays: number;
    agingOpenRequestCount: number;
    openRequestCount: number;
  };
  wallets: {
    sellerPendingTotalCents: number;
    sellerAvailableTotalCents: number;
    platformPendingTotalCents: number;
    platformAvailableTotalCents: number;
  };
  refunds: {
    volume24hCents: number;
  };
  reconciliation: {
    orderNetSalesTodayCents: number;
    ledgerNetSalesTodayCents: number;
    deltaCents: number;
  };
};

type FinanceLedgerRow = {
  id: number;
  timestamp: string;
  accountType: string;
  direction: string;
  amountCents: number;
  currency: string;
  orderId?: number | null;
  sellerId?: number | null;
  eventType: string;
  channel?: string | null;
  reference: string;
};

type FinanceLedgerResponse = {
  data: FinanceLedgerRow[];
  meta: PaginationMeta;
};

type WalletRow = {
  sellerId: number;
  sellerName: string;
  currency: string;
  pendingBalanceCents: number;
  availableBalanceCents: number;
  totalEarnedCents: number;
  totalPaidOutCents: number;
  lastActivityAt?: string | null;
};

type WalletResponse = {
  data: WalletRow[];
  meta: PaginationMeta;
};

type RefundLedgerPreviewRow = {
  accountType: string;
  direction: string;
  amountCents: number;
  createdAt: string;
};

type RefundRow = {
  id: number;
  orderId: number;
  sellerId?: number | null;
  customerId: number;
  status: string;
  reason?: string | null;
  responseNote?: string | null;
  requestedAt: string;
  decidedAt?: string | null;
  originalSnapshot: {
    subtotalAmountCents: number;
    commissionAmountCents: number;
    taxAmountCents: number;
    totalAmountCents: number;
  };
  refundAmountCents: number;
  ledgerPreview: RefundLedgerPreviewRow[];
};

type RefundResponse = {
  data: RefundRow[];
  meta: PaginationMeta;
};

type MismatchRow = {
  orderId: number;
  sellerId?: number | null;
  staffUserId: number;
  source: string;
  totalAmountCents: number;
  createdAt: string;
  meta?: unknown;
};

type MismatchResponse = {
  data: MismatchRow[];
  meta: PaginationMeta;
};

type PayoutRow = {
  id: number;
  beneficiaryUserId: number;
  amountCents: number;
  status: string;
  requestedAt: string;
};

type PayoutResponse = {
  data: PayoutRow[];
  meta: PaginationMeta;
};

const toPositiveInt = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : undefined;
};

const normalizeDirectionClass = (direction: string) => {
  const key = String(direction ?? '').trim().toUpperCase();
  if (key === 'DEBIT') return 'bg-[#FFF7E6] text-[#7A4B00]';
  if (key === 'CREDIT') return 'bg-[#E6FBF2] text-[#0F5132]';
  return 'bg-[#F3EEE3] text-[#3E2723]';
};

const getNestedValue = (payload: unknown, keyPath: string) => {
  if (!payload || typeof payload !== 'object') return undefined;
  const parts = keyPath.split('.');
  let current: unknown = payload;
  for (const part of parts) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const extractNumberFromMeta = (meta: unknown, candidates: string[]) => {
  for (const key of candidates) {
    const raw = getNestedValue(meta, key);
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
};

const resolveViewFromPathname = (pathname: string): ViewKey => {
  if (pathname.includes('/finance/ledger')) return 'ledger';
  if (pathname.includes('/finance/wallets')) return 'wallets';
  if (pathname.includes('/finance/refunds')) return 'refunds';
  if (pathname.includes('/finance/mismatch-monitor')) return 'mismatch';
  return 'overview';
};

export default function AdminFinanceOverviewPage() {
  const pathname = usePathname();
  const basePath = pathname.startsWith('/platform') ? '/platform' : '/admin';

  const [view, setView] = useState<ViewKey>(() => resolveViewFromPathname(pathname));

  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerSellerId, setLedgerSellerId] = useState('');
  const [ledgerOrderId, setLedgerOrderId] = useState('');
  const [ledgerType, setLedgerType] = useState('');
  const [ledgerChannel, setLedgerChannel] = useState('');
  const [ledgerDateFrom, setLedgerDateFrom] = useState('');
  const [ledgerDateTo, setLedgerDateTo] = useState('');

  const [walletPage, setWalletPage] = useState(1);

  const [refundPage, setRefundPage] = useState(1);
  const [refundStatus, setRefundStatus] = useState('');

  const [mismatchPage, setMismatchPage] = useState(1);

  const healthQuery = useQuery<FinanceHealth>({
    queryKey: ['finance-health-v2'],
    queryFn: async () => {
      const res = await api.get<FinanceHealth>('/platform/finance/health');
      return res.data;
    },
  });

  const payoutPreviewQuery = useQuery<PayoutResponse>({
    queryKey: ['finance-payout-preview-v2'],
    enabled: view === 'overview',
    queryFn: async () => {
      const res = await api.get<PayoutResponse>('/platform/finance/payouts', {
        params: { status: 'pending', page: 1, pageSize: 5 },
      });
      return res.data;
    },
  });

  const ledgerQuery = useQuery<FinanceLedgerResponse>({
    queryKey: [
      'finance-ledger-v2',
      {
        ledgerPage,
        ledgerSellerId,
        ledgerOrderId,
        ledgerType,
        ledgerChannel,
        ledgerDateFrom,
        ledgerDateTo,
      },
    ],
    enabled: view === 'ledger',
    queryFn: async () => {
      const res = await api.get<FinanceLedgerResponse>('/platform/finance/ledger', {
        params: {
          page: ledgerPage,
          pageSize: 20,
          sellerId: toPositiveInt(ledgerSellerId),
          orderId: toPositiveInt(ledgerOrderId),
          type: ledgerType || undefined,
          channel: ledgerChannel || undefined,
          dateFrom: ledgerDateFrom || undefined,
          dateTo: ledgerDateTo || undefined,
        },
      });
      return res.data;
    },
  });

  const walletsQuery = useQuery<WalletResponse>({
    queryKey: ['finance-wallets-v2', walletPage],
    enabled: view === 'wallets',
    queryFn: async () => {
      const res = await api.get<WalletResponse>('/platform/finance/wallets', {
        params: {
          page: walletPage,
          pageSize: 20,
        },
      });
      return res.data;
    },
  });

  const refundsQuery = useQuery<RefundResponse>({
    queryKey: ['finance-refunds-v2', { refundPage, refundStatus }],
    enabled: view === 'refunds',
    queryFn: async () => {
      const res = await api.get<RefundResponse>('/platform/finance/refunds', {
        params: {
          page: refundPage,
          pageSize: 10,
          status: refundStatus || undefined,
        },
      });
      return res.data;
    },
  });

  const mismatchesQuery = useQuery<MismatchResponse>({
    queryKey: ['finance-mismatches-v2', mismatchPage],
    enabled: view === 'mismatch',
    queryFn: async () => {
      const res = await api.get<MismatchResponse>('/platform/risk/price-mismatches', {
        params: {
          page: mismatchPage,
          pageSize: 20,
        },
      });
      return res.data;
    },
  });

  const mismatchRows = useMemo(() => {
    return (mismatchesQuery.data?.data ?? []).map((row) => {
      const expectedCents = extractNumberFromMeta(row.meta, [
        'expectedTotalAmountCents',
        'expectedTotalCents',
        'expectedPriceCents',
        'pricing.expectedTotalAmountCents',
        'pricing.expectedPriceCents',
      ]);
      const actualCents =
        extractNumberFromMeta(row.meta, [
          'actualTotalAmountCents',
          'actualTotalCents',
          'actualPriceCents',
          'pricing.actualTotalAmountCents',
          'pricing.actualPriceCents',
        ]) ?? row.totalAmountCents;
      const deltaPct =
        typeof expectedCents === 'number' && expectedCents > 0
          ? ((actualCents - expectedCents) / expectedCents) * 100
          : undefined;

      return {
        ...row,
        expectedCents,
        actualCents,
        deltaPct,
      };
    });
  }, [mismatchesQuery.data?.data]);

  const tabs = [
    { key: 'overview', label: 'Overview', href: `${basePath}/finance` },
    { key: 'ledger', label: 'Ledger', href: `${basePath}/finance/ledger` },
    { key: 'wallets', label: 'Wallets', href: `${basePath}/finance/wallets` },
    { key: 'refunds', label: 'Refunds', href: `${basePath}/finance/refunds` },
    {
      key: 'mismatch',
      label: 'Mismatch Monitor',
      href: `${basePath}/finance/mismatch-monitor`,
    },
  ] as const;

  const metrics = healthQuery.data;

  useEffect(() => {
    setView(resolveViewFromPathname(pathname));
  }, [pathname]);

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-gradient-to-br from-[#F7F1E5] via-white to-[#ECF6F3] px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Finance
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Finance Control Center
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Para akisini operasyon, risk ve immutable ledger perspektifinde tek panelde izleyin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`${basePath}/finance/payouts`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--primary-800)] hover:bg-[var(--neutral-50)]"
            >
              Payouts
            </Link>
            <Link
              href={`${basePath}/risk-control`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--primary-800)] hover:bg-[var(--neutral-50)]"
            >
              Audit
            </Link>
            <Link
              href={`${basePath}/settings`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--primary-800)] hover:bg-[var(--neutral-50)]"
            >
              Settings
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={`rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                view === tab.key
                  ? 'border-[var(--primary-800)] bg-[var(--primary-800)] text-white'
                  : 'border-[var(--neutral-200)] bg-white text-[var(--primary-800)]'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </section>

      {healthQuery.isLoading ? (
        <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-10">
          <Spinner label="Finance verileri yukleniyor..." />
        </section>
      ) : null}

      {healthQuery.isError ? (
        <section className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Finance health verisi alinamadi.
        </section>
      ) : null}

      {!healthQuery.isLoading && !healthQuery.isError && view === 'overview' && metrics ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Total Platform Revenue (Today)
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {formatPrice(metrics.reconciliation.orderNetSalesTodayCents)}
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Seller Pending Total
              </p>
              <p className="mt-2 text-2xl font-serif text-[#7A4B00]">
                {formatPrice(metrics.wallets.sellerPendingTotalCents)}
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Seller Available Total
              </p>
              <p className="mt-2 text-2xl font-serif text-[#0F5132]">
                {formatPrice(metrics.wallets.sellerAvailableTotalCents)}
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Open Payout Requests
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {metrics.payouts.openRequestCount}
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Refund Volume (24h)
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {formatPrice(metrics.refunds.volume24hCents)}
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Price Mismatch Rate
              </p>
              <p className="mt-2 text-2xl font-serif text-[#9B1C1C]">
                {(metrics.risk.mismatchRate24h * 100).toFixed(2)}%
              </p>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
              <h2 className="text-2xl font-serif text-[var(--primary-800)]">Ledger Invariant</h2>
              <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  Status
                </p>
                <p
                  className={`mt-2 text-xl font-semibold ${
                    metrics.ledgerInvariant.ok ? 'text-[#0F5132]' : 'text-[#9B1C1C]'
                  }`}
                >
                  {metrics.ledgerInvariant.ok ? 'OK' : 'IMBALANCED'}
                </p>
                <p className="mt-2 text-xs text-[var(--neutral-600)]">
                  Imbalance Event Count: {metrics.ledgerInvariant.imbalanceEventCount}
                </p>
                <p className="mt-1 text-xs text-[var(--neutral-600)]">
                  Last Check: {formatDateTime(metrics.lastCheckedAt)}
                </p>
              </div>

              <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4 text-sm">
                <p className="font-semibold text-[var(--primary-800)]">Daily Reconciliation</p>
                <p className="mt-2 text-[var(--neutral-700)]">
                  Order Net Sales Today: {formatPrice(metrics.reconciliation.orderNetSalesTodayCents)}
                </p>
                <p className="mt-1 text-[var(--neutral-700)]">
                  Ledger Net Sales Today: {formatPrice(metrics.reconciliation.ledgerNetSalesTodayCents)}
                </p>
                <p className="mt-1 text-[var(--neutral-700)]">
                  Delta: {formatPrice(metrics.reconciliation.deltaCents)}
                </p>
              </div>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
              <h2 className="text-2xl font-serif text-[var(--primary-800)]">Pending Payout Queue</h2>
              {payoutPreviewQuery.isLoading ? (
                <div className="mt-4">
                  <Spinner label="Payout queue yukleniyor..." />
                </div>
              ) : null}
              {payoutPreviewQuery.isError ? (
                <p className="mt-4 text-sm text-red-700">Payout queue alinamadi.</p>
              ) : null}
              {!payoutPreviewQuery.isLoading && !payoutPreviewQuery.isError ? (
                <div className="mt-4 space-y-2">
                  {(payoutPreviewQuery.data?.data ?? []).map((row) => (
                    <div
                      key={row.id}
                      className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3"
                    >
                      <p className="text-sm font-semibold text-[var(--primary-800)]">
                        Request #{row.id} - Seller User #{row.beneficiaryUserId}
                      </p>
                      <p className="mt-1 text-xs text-[var(--neutral-600)]">
                        {formatPrice(row.amountCents)} | {formatDateTime(row.requestedAt)}
                      </p>
                    </div>
                  ))}
                  {(payoutPreviewQuery.data?.data ?? []).length === 0 ? (
                    <p className="text-sm text-[var(--neutral-600)]">Bekleyen payout talebi yok.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
      {!healthQuery.isLoading && !healthQuery.isError && view === 'ledger' ? (
        <section className="space-y-4 rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <h2 className="text-2xl font-serif text-[var(--primary-800)]">Ledger</h2>

          <div className="grid gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4 md:grid-cols-3 xl:grid-cols-6">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-600)]">
              Seller
              <input
                value={ledgerSellerId}
                onChange={(e) => {
                  setLedgerSellerId(e.target.value);
                  setLedgerPage(1);
                }}
                placeholder="Seller ID"
                inputMode="numeric"
                className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm"
              />
            </label>

            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-600)]">
              Order
              <input
                value={ledgerOrderId}
                onChange={(e) => {
                  setLedgerOrderId(e.target.value);
                  setLedgerPage(1);
                }}
                placeholder="Order ID"
                inputMode="numeric"
                className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm"
              />
            </label>

            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-600)]">
              Type
              <select
                value={ledgerType}
                onChange={(e) => {
                  setLedgerType(e.target.value);
                  setLedgerPage(1);
                }}
                className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm"
              >
                <option value="">Tum</option>
                <option value="ORDER">ORDER</option>
                <option value="REFUND">REFUND</option>
                <option value="PAYOUT">PAYOUT</option>
              </select>
            </label>

            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-600)]">
              Channel
              <select
                value={ledgerChannel}
                onChange={(e) => {
                  setLedgerChannel(e.target.value);
                  setLedgerPage(1);
                }}
                className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm"
              >
                <option value="">Tum</option>
                <option value="POS">POS</option>
                <option value="MARKETPLACE">MARKETPLACE</option>
                <option value="MANUAL">MANUAL</option>
              </select>
            </label>

            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-600)]">
              Date From
              <input
                type="date"
                value={ledgerDateFrom}
                onChange={(e) => {
                  setLedgerDateFrom(e.target.value);
                  setLedgerPage(1);
                }}
                className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm"
              />
            </label>

            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-600)]">
              Date To
              <input
                type="date"
                value={ledgerDateTo}
                onChange={(e) => {
                  setLedgerDateTo(e.target.value);
                  setLedgerPage(1);
                }}
                className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm"
              />
            </label>
          </div>

          {ledgerQuery.isLoading ? <Spinner label="Ledger yukleniyor..." /> : null}
          {ledgerQuery.isError ? <p className="text-sm text-red-700">Ledger verisi alinamadi.</p> : null}

          {!ledgerQuery.isLoading && !ledgerQuery.isError ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--neutral-200)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                      <th className="py-3 pr-4">Timestamp</th>
                      <th className="py-3 pr-4">Account Type</th>
                      <th className="py-3 pr-4">Direction</th>
                      <th className="py-3 pr-4">Amount</th>
                      <th className="py-3 pr-4">Order</th>
                      <th className="py-3 pr-4">Type</th>
                      <th className="py-3">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ledgerQuery.data?.data ?? []).map((row) => (
                      <tr key={row.id} className="border-b border-[var(--neutral-100)]">
                        <td className="py-3 pr-4 text-xs text-[var(--neutral-700)]">{formatDateTime(row.timestamp)}</td>
                        <td className="py-3 pr-4 text-xs text-[var(--neutral-700)]">{row.accountType}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${normalizeDirectionClass(
                              row.direction,
                            )}`}
                          >
                            {row.direction === 'DEBIT' ? 'DR' : row.direction === 'CREDIT' ? 'CR' : row.direction}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-semibold text-[var(--primary-800)]">{formatPrice(row.amountCents)}</td>
                        <td className="py-3 pr-4 text-xs text-[var(--neutral-700)]">{row.orderId ? `#${row.orderId}` : '-'}</td>
                        <td className="py-3 pr-4 text-xs text-[var(--neutral-700)]">{row.eventType}</td>
                        <td className="py-3 text-xs text-[var(--neutral-700)]">{row.reference}</td>
                      </tr>
                    ))}
                    {(ledgerQuery.data?.data ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-sm text-[var(--neutral-600)]">
                          Ledger kaydi bulunamadi.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setLedgerPage((prev) => Math.max(1, prev - 1))}
                  disabled={(ledgerQuery.data?.meta.page ?? 1) <= 1}
                  className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Onceki
                </button>
                <p className="text-xs font-semibold text-[var(--neutral-600)]">
                  Sayfa {ledgerQuery.data?.meta.page ?? 1} / {ledgerQuery.data?.meta.totalPages ?? 1}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setLedgerPage((prev) =>
                      Math.min(ledgerQuery.data?.meta.totalPages ?? prev + 1, prev + 1),
                    )
                  }
                  disabled={(ledgerQuery.data?.meta.page ?? 1) >= (ledgerQuery.data?.meta.totalPages ?? 1)}
                  className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sonraki
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {!healthQuery.isLoading && !healthQuery.isError && view === 'wallets' ? (
        <section className="space-y-4 rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <h2 className="text-2xl font-serif text-[var(--primary-800)]">Wallets</h2>
          {walletsQuery.isLoading ? <Spinner label="Wallets yukleniyor..." /> : null}
          {walletsQuery.isError ? <p className="text-sm text-red-700">Wallet verisi alinamadi.</p> : null}

          {!walletsQuery.isLoading && !walletsQuery.isError ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--neutral-200)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                      <th className="py-3 pr-4">Seller</th>
                      <th className="py-3 pr-4">Pending</th>
                      <th className="py-3 pr-4">Available</th>
                      <th className="py-3 pr-4">Total Earned</th>
                      <th className="py-3 pr-4">Total Paid Out</th>
                      <th className="py-3">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(walletsQuery.data?.data ?? []).map((row) => (
                      <tr key={row.sellerId} className="border-b border-[var(--neutral-100)]">
                        <td className="py-3 pr-4 text-sm font-semibold text-[var(--primary-800)]">
                          {row.sellerName} (#{row.sellerId})
                        </td>
                        <td className="py-3 pr-4 text-sm text-[#7A4B00]">{formatPrice(row.pendingBalanceCents)}</td>
                        <td className="py-3 pr-4 text-sm text-[#0F5132]">{formatPrice(row.availableBalanceCents)}</td>
                        <td className="py-3 pr-4 text-sm text-[var(--neutral-700)]">{formatPrice(row.totalEarnedCents)}</td>
                        <td className="py-3 pr-4 text-sm text-[var(--neutral-700)]">{formatPrice(row.totalPaidOutCents)}</td>
                        <td className="py-3 text-sm text-[var(--neutral-600)]">
                          {row.lastActivityAt ? formatDateTime(row.lastActivityAt) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setWalletPage((prev) => Math.max(1, prev - 1))}
                  disabled={(walletsQuery.data?.meta.page ?? 1) <= 1}
                  className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Onceki
                </button>
                <p className="text-xs font-semibold text-[var(--neutral-600)]">
                  Sayfa {walletsQuery.data?.meta.page ?? 1} / {walletsQuery.data?.meta.totalPages ?? 1}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setWalletPage((prev) =>
                      Math.min(walletsQuery.data?.meta.totalPages ?? prev + 1, prev + 1),
                    )
                  }
                  disabled={(walletsQuery.data?.meta.page ?? 1) >= (walletsQuery.data?.meta.totalPages ?? 1)}
                  className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sonraki
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}
      {!healthQuery.isLoading && !healthQuery.isError && view === 'refunds' ? (
        <section className="space-y-4 rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-serif text-[var(--primary-800)]">Refunds</h2>
            <select
              value={refundStatus}
              onChange={(e) => {
                setRefundStatus(e.target.value);
                setRefundPage(1);
              }}
              className="h-10 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm"
            >
              <option value="">Tum</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          {refundsQuery.isLoading ? <Spinner label="Refunds yukleniyor..." /> : null}
          {refundsQuery.isError ? <p className="text-sm text-red-700">Refund verisi alinamadi.</p> : null}

          {!refundsQuery.isLoading && !refundsQuery.isError ? (
            <div className="space-y-3">
              {(refundsQuery.data?.data ?? []).map((row) => (
                <div
                  key={row.id}
                  className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--primary-800)]">
                        Refund #{row.id} | Order #{row.orderId} | Status: {row.status}
                      </p>
                      <p className="mt-1 text-xs text-[var(--neutral-600)]">
                        Requested: {formatDateTime(row.requestedAt)} | Seller: {row.sellerId ?? '-'}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--primary-800)]">
                      Refund Amount: {formatPrice(row.refundAmountCents)}
                    </p>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-4 text-sm">
                    <p className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3 py-2">
                      Original Subtotal: {formatPrice(row.originalSnapshot.subtotalAmountCents)}
                    </p>
                    <p className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3 py-2">
                      Original Commission: {formatPrice(row.originalSnapshot.commissionAmountCents)}
                    </p>
                    <p className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3 py-2">
                      Original Tax: {formatPrice(row.originalSnapshot.taxAmountCents)}
                    </p>
                    <p className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3 py-2">
                      Original Total: {formatPrice(row.originalSnapshot.totalAmountCents)}
                    </p>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[var(--neutral-200)] uppercase tracking-[0.18em] text-[var(--neutral-500)]">
                          <th className="py-2 pr-3">Ledger Account</th>
                          <th className="py-2 pr-3">Direction</th>
                          <th className="py-2 pr-3">Amount</th>
                          <th className="py-2">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.ledgerPreview.map((entry, index) => (
                          <tr key={`${row.id}-${entry.accountType}-${index}`} className="border-b border-[var(--neutral-100)]">
                            <td className="py-2 pr-3 text-[var(--neutral-700)]">{entry.accountType}</td>
                            <td className="py-2 pr-3 text-[var(--neutral-700)]">{entry.direction}</td>
                            <td className="py-2 pr-3 text-[var(--neutral-700)]">{formatPrice(entry.amountCents)}</td>
                            <td className="py-2 text-[var(--neutral-600)]">{formatDateTime(entry.createdAt)}</td>
                          </tr>
                        ))}
                        {row.ledgerPreview.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-3 text-center text-[var(--neutral-600)]">
                              Ledger preview yok.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {(refundsQuery.data?.data ?? []).length === 0 ? (
                <p className="text-sm text-[var(--neutral-600)]">Refund kaydi bulunamadi.</p>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setRefundPage((prev) => Math.max(1, prev - 1))}
                  disabled={(refundsQuery.data?.meta.page ?? 1) <= 1}
                  className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Onceki
                </button>
                <p className="text-xs font-semibold text-[var(--neutral-600)]">
                  Sayfa {refundsQuery.data?.meta.page ?? 1} / {refundsQuery.data?.meta.totalPages ?? 1}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setRefundPage((prev) =>
                      Math.min(refundsQuery.data?.meta.totalPages ?? prev + 1, prev + 1),
                    )
                  }
                  disabled={(refundsQuery.data?.meta.page ?? 1) >= (refundsQuery.data?.meta.totalPages ?? 1)}
                  className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sonraki
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {!healthQuery.isLoading && !healthQuery.isError && view === 'mismatch' ? (
        <section className="space-y-4 rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <h2 className="text-2xl font-serif text-[var(--primary-800)]">Mismatch Monitor</h2>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                Mismatch Count (24h)
              </p>
              <p className="mt-2 text-xl font-semibold text-[#9B1C1C]">{metrics?.risk.mismatchCount24h ?? 0}</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                Total Orders (24h)
              </p>
              <p className="mt-2 text-xl font-semibold text-[var(--primary-800)]">{metrics?.risk.totalOrders24h ?? 0}</p>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                Mismatch Rate (24h)
              </p>
              <p className="mt-2 text-xl font-semibold text-[#9B1C1C]">
                {(((metrics?.risk.mismatchRate24h ?? 0) * 100)).toFixed(2)}%
              </p>
            </div>
          </div>

          {mismatchesQuery.isLoading ? <Spinner label="Mismatch kayitlari yukleniyor..." /> : null}
          {mismatchesQuery.isError ? <p className="text-sm text-red-700">Mismatch kayitlari alinamadi.</p> : null}

          {!mismatchesQuery.isLoading && !mismatchesQuery.isError ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--neutral-200)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                      <th className="py-3 pr-4">Order</th>
                      <th className="py-3 pr-4">Seller</th>
                      <th className="py-3 pr-4">POS Staff</th>
                      <th className="py-3 pr-4">Expected Price</th>
                      <th className="py-3 pr-4">Actual Price</th>
                      <th className="py-3 pr-4">Delta %</th>
                      <th className="py-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mismatchRows.map((row) => (
                      <tr key={row.orderId} className="border-b border-[var(--neutral-100)]">
                        <td className="py-3 pr-4 font-semibold text-[var(--primary-800)]">#{row.orderId}</td>
                        <td className="py-3 pr-4 text-[var(--neutral-700)]">{row.sellerId ?? '-'}</td>
                        <td className="py-3 pr-4 text-[var(--neutral-700)]">#{row.staffUserId}</td>
                        <td className="py-3 pr-4 text-[var(--neutral-700)]">
                          {typeof row.expectedCents === 'number' ? formatPrice(row.expectedCents) : '-'}
                        </td>
                        <td className="py-3 pr-4 text-[var(--neutral-700)]">{formatPrice(row.actualCents)}</td>
                        <td className="py-3 pr-4 text-[var(--neutral-700)]">
                          {typeof row.deltaPct === 'number' ? `${row.deltaPct.toFixed(2)}%` : '-'}
                        </td>
                        <td className="py-3 text-[var(--neutral-600)]">{formatDateTime(row.createdAt)}</td>
                      </tr>
                    ))}
                    {mismatchRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-sm text-[var(--neutral-600)]">
                          Mismatch kaydi bulunamadi.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setMismatchPage((prev) => Math.max(1, prev - 1))}
                  disabled={(mismatchesQuery.data?.meta.page ?? 1) <= 1}
                  className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Onceki
                </button>
                <p className="text-xs font-semibold text-[var(--neutral-600)]">
                  Sayfa {mismatchesQuery.data?.meta.page ?? 1} / {mismatchesQuery.data?.meta.totalPages ?? 1}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setMismatchPage((prev) =>
                      Math.min(mismatchesQuery.data?.meta.totalPages ?? prev + 1, prev + 1),
                    )
                  }
                  disabled={(mismatchesQuery.data?.meta.page ?? 1) >= (mismatchesQuery.data?.meta.totalPages ?? 1)}
                  className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sonraki
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
