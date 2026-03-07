'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import Spinner from '@/components/common/Spinner';
import { formatDateTime, formatPrice } from '@/lib/format';
import api from '@/services/api';
import { useAppSelector } from '@/store';

interface SellerDashboardSummary {
  ordersToday: number;
  revenueTodayCents: number;
}

interface SellerPayoutability {
  pendingBalanceCents: number;
  availableBalanceCents: number;
}

interface OrderRow {
  id: number;
  source: string;
  statusKey: string;
  totalAmountCents: number;
  commissionAmountCents?: number;
  sellerNetAmountCents?: number;
  priceMismatch?: boolean;
  createdAt: string;
}

interface PayoutRow {
  id: number;
  amountCents: number;
  status: string;
  requestedAt: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface PaginatedOrders {
  data: OrderRow[];
  meta: PaginationMeta;
}

interface PaginatedPayouts {
  data: PayoutRow[];
  meta: PaginationMeta;
}

const PANEL_QUERY_TIMEOUT_MS = 12000;

const statusBadgeClassName = (status: string) => {
  const key = String(status ?? '').trim().toUpperCase();
  if (key === 'REQUESTED' || key === 'PENDING') return 'bg-[#FFF7E6] text-[#7A4B00]';
  if (key === 'APPROVED') return 'bg-[#E8F1FF] text-[#0B3B91]';
  if (key === 'PAID' || key === 'COMPLETED') return 'bg-[#E6FBF2] text-[#0F5132]';
  if (key === 'REJECTED') return 'bg-[#FDECEC] text-[#9B1C1C]';
  return 'bg-[#F3EEE3] text-[#3E2723]';
};

export default function SellerDashboardPage() {
  const user = useAppSelector((state) => state.user.user);
  const isSeller = user?.role === 'SELLER';

  const summaryQuery = useQuery<SellerDashboardSummary>({
    queryKey: ['seller-dashboard-summary-v2'],
    queryFn: async () => {
      const res = await api.get<SellerDashboardSummary>('/dashboard/summary', {
        timeout: PANEL_QUERY_TIMEOUT_MS,
      });
      return res.data;
    },
    retry: 1,
  });

  const payoutabilityQuery = useQuery<SellerPayoutability>({
    queryKey: ['seller-payoutability-dashboard'],
    enabled: isSeller,
    queryFn: async () => {
      const res = await api.get<SellerPayoutability>('/seller/finance/payoutability', {
        timeout: PANEL_QUERY_TIMEOUT_MS,
      });
      return res.data;
    },
    retry: 1,
  });

  const latestOrdersQuery = useQuery<PaginatedOrders>({
    queryKey: ['seller-dashboard-latest-orders'],
    queryFn: async () => {
      const res = await api.get<PaginatedOrders>('/orders', {
        params: { page: 1, pageSize: 10 },
        timeout: PANEL_QUERY_TIMEOUT_MS,
      });
      return res.data;
    },
    retry: 1,
  });

  const latestPayoutQuery = useQuery<PaginatedPayouts>({
    queryKey: ['seller-dashboard-latest-payout'],
    enabled: isSeller,
    queryFn: async () => {
      const res = await api.get<PaginatedPayouts>('/seller/finance/payouts', {
        params: { page: 1, pageSize: 1 },
        timeout: PANEL_QUERY_TIMEOUT_MS,
      });
      return res.data;
    },
    retry: 1,
  });

  const latestOrders = latestOrdersQuery.data?.data ?? [];
  const mismatchCount = latestOrders.filter((row) => Boolean(row.priceMismatch)).length;
  const latestPayout = latestPayoutQuery.data?.data?.[0];
  const hasCriticalError = summaryQuery.isError && latestOrdersQuery.isError;

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Seller
        </p>
        <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Dashboard</h1>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">
          Bugun satis performansi, mismatch sinyalleri ve son payout durumunu izleyin.
        </p>
      </section>

      {summaryQuery.isLoading || latestOrdersQuery.isLoading ? (
        <Spinner label="Dashboard verileri yukleniyor..." />
      ) : null}

      {hasCriticalError ? (
        <section className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Dashboard verileri alinamadi.
        </section>
      ) : null}

      {!hasCriticalError ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Today Sales
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {summaryQuery.data ? formatPrice(summaryQuery.data.revenueTodayCents) : '—'}
              </p>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Today Orders
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {summaryQuery.data?.ordersToday ?? '—'}
              </p>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Pending Balance
              </p>
              <p className="mt-2 text-2xl font-serif text-[#7A4B00]">
                {payoutabilityQuery.data
                  ? formatPrice(payoutabilityQuery.data.pendingBalanceCents)
                  : '—'}
              </p>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Available Balance
              </p>
              <p className="mt-2 text-2xl font-serif text-[#0F5132]">
                {payoutabilityQuery.data
                  ? formatPrice(payoutabilityQuery.data.availableBalanceCents)
                  : '—'}
              </p>
            </div>
          </section>

          <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-serif text-[var(--primary-800)]">Son 10 siparis</h2>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                  mismatchCount > 0 ? 'bg-[#FDECEC] text-[#9B1C1C]' : 'bg-[#E6FBF2] text-[#0F5132]'
                }`}
              >
                Mismatch {mismatchCount}
              </span>
            </div>
            {latestOrdersQuery.isError ? (
              <div className="mt-4 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                Siparis listesi alinamadi.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--neutral-200)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                      <th className="py-3 pr-4">Order</th>
                      <th className="py-3 pr-4">Channel</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Total</th>
                      <th className="py-3 pr-4">Commission</th>
                      <th className="py-3 pr-4">Seller Net</th>
                      <th className="py-3 pr-4">Mismatch</th>
                      <th className="py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestOrders.map((row) => (
                      <tr key={row.id} className="border-b border-[var(--neutral-100)]">
                        <td className="py-3 pr-4 font-semibold text-[var(--primary-800)]">#{row.id}</td>
                        <td className="py-3 pr-4 text-[var(--neutral-700)]">{row.source}</td>
                        <td className="py-3 pr-4 text-[var(--neutral-700)]">{row.statusKey}</td>
                        <td className="py-3 pr-4 text-[var(--neutral-700)]">
                          {formatPrice(row.totalAmountCents)}
                        </td>
                        <td className="py-3 pr-4 text-[var(--neutral-700)]">
                          {formatPrice(row.commissionAmountCents ?? 0)}
                        </td>
                        <td className="py-3 pr-4 text-[var(--neutral-700)]">
                          {formatPrice(row.sellerNetAmountCents ?? 0)}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                              row.priceMismatch ? 'bg-[#FDECEC] text-[#9B1C1C]' : 'bg-[#E6FBF2] text-[#0F5132]'
                            }`}
                          >
                            {row.priceMismatch ? 'Flag' : 'OK'}
                          </span>
                        </td>
                        <td className="py-3 text-[var(--neutral-600)]">
                          {formatDateTime(row.createdAt)}
                        </td>
                      </tr>
                    ))}
                    {latestOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-5 text-center text-sm text-[var(--neutral-600)]">
                          Siparis kaydi bulunamadi.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
            <Link
              href="/dashboard/orders"
              className="mt-4 inline-flex text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] hover:underline"
            >
              Tum siparisleri goruntule
            </Link>
          </section>

          <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
            <h2 className="text-xl font-serif text-[var(--primary-800)]">Son payout talebi</h2>
            {!isSeller ? (
              <p className="mt-3 text-sm text-[var(--neutral-600)]">
                Bu alan sadece SELLER hesabinda aktif.
              </p>
            ) : latestPayoutQuery.isError ? (
              <p className="mt-3 text-sm text-red-700">Payout verisi alinamadi.</p>
            ) : latestPayout ? (
              <div className="mt-3 flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--primary-800)]">#{latestPayout.id}</p>
                  <p className="text-xs text-[var(--neutral-600)]">
                    {formatDateTime(latestPayout.requestedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[var(--primary-800)]">
                    {formatPrice(latestPayout.amountCents)}
                  </p>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${statusBadgeClassName(
                      latestPayout.status,
                    )}`}
                  >
                    {latestPayout.status}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--neutral-600)]">Payout kaydi bulunamadi.</p>
            )}
            <Link
              href="/dashboard/finance"
              className="mt-4 inline-flex text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] hover:underline"
            >
              Payout ekranina git
            </Link>
          </section>
        </>
      ) : null}
    </div>
  );
}

