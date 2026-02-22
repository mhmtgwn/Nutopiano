'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CreditCard, Landmark, TrendingUp, Wallet } from 'lucide-react';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatPrice } from '@/lib/format';

interface DashboardSummary {
  activeProducts: number;
  lowStockProducts: number;
  ordersTotal: number;
  ordersToday: number;
  revenueTodayCents: number;
}

interface DashboardReportsSummary {
  range: {
    from: string;
    to: string;
    days: number;
  };
  ordersCount: number;
  revenueCents: number;
  averageOrderValueCents: number;
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface PayoutRow {
  id: number;
  beneficiaryUserId: number;
  amountCents: number;
  status: string;
  requestedAt: string;
}

interface PaginatedPayouts {
  data: PayoutRow[];
  meta: PaginationMeta;
}

interface SettingRow {
  id: number;
  key: string;
  value: unknown;
}

const fetchPayouts = async (status: 'pending' | 'approved' | 'completed', pageSize = 1) => {
  const res = await api.get<PaginatedPayouts>('/platform/finance/payouts', {
    params: { status, page: 1, pageSize },
  });
  return res.data;
};

export default function AdminFinanceOverviewPage() {
  const summaryQuery = useQuery<DashboardSummary>({
    queryKey: ['admin-finance-summary'],
    queryFn: async () => {
      const res = await api.get<DashboardSummary>('/dashboard/summary');
      return res.data;
    },
  });

  const reportsQuery = useQuery<DashboardReportsSummary>({
    queryKey: ['admin-finance-reports'],
    queryFn: async () => {
      const res = await api.get<DashboardReportsSummary>('/dashboard/reports/summary');
      return res.data;
    },
  });

  const pendingMetaQuery = useQuery<PaginatedPayouts>({
    queryKey: ['admin-finance-payout-pending-meta'],
    queryFn: async () => fetchPayouts('pending', 1),
  });

  const approvedMetaQuery = useQuery<PaginatedPayouts>({
    queryKey: ['admin-finance-payout-approved-meta'],
    queryFn: async () => fetchPayouts('approved', 1),
  });

  const completedMetaQuery = useQuery<PaginatedPayouts>({
    queryKey: ['admin-finance-payout-completed-meta'],
    queryFn: async () => fetchPayouts('completed', 1),
  });

  const pendingListQuery = useQuery<PaginatedPayouts>({
    queryKey: ['admin-finance-payout-pending-list'],
    queryFn: async () => fetchPayouts('pending', 6),
  });

  const commissionRateQuery = useQuery<number>({
    queryKey: ['admin-finance-commission-rate'],
    queryFn: async () => {
      try {
        const res = await api.get<SettingRow>('/settings/global_commission_rate');
        const value = Number(res.data?.value);
        if (!Number.isFinite(value) || value < 0) return 0.05;
        return value;
      } catch {
        return 0.05;
      }
    },
  });

  const isLoading =
    summaryQuery.isLoading ||
    reportsQuery.isLoading ||
    pendingMetaQuery.isLoading ||
    approvedMetaQuery.isLoading ||
    completedMetaQuery.isLoading ||
    pendingListQuery.isLoading ||
    commissionRateQuery.isLoading;

  const isError = summaryQuery.isError || reportsQuery.isError;

  const pendingPreviewTotalCents = useMemo(() => {
    return (pendingListQuery.data?.data ?? []).reduce(
      (acc, item) => acc + (Number(item.amountCents) || 0),
      0,
    );
  }, [pendingListQuery.data?.data]);

  const pendingCount = pendingMetaQuery.data?.meta.total ?? 0;
  const approvedCount = approvedMetaQuery.data?.meta.total ?? 0;
  const completedCount = completedMetaQuery.data?.meta.total ?? 0;

  const commissionRate = commissionRateQuery.data ?? 0.05;
  const commissionLabel = `%${(commissionRate * 100).toFixed(2)}`;

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-gradient-to-br from-[#F7F1E5] via-white to-[#ECF6F3] px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Finans
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Finans Merkezi
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Ciro trendi, payout hattı ve komisyon oranlarını tek panelde izleyin.
            </p>
          </div>
          <Link
            href="/admin/finance/payouts"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
          >
            Payouts <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-10">
          <Spinner label="Finans verileri yükleniyor..." />
        </section>
      ) : null}

      {isError ? (
        <section className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          Finans metrikleri alınamadı. Oturumu yenileyip tekrar deneyin.
        </section>
      ) : null}

      {!isLoading && !isError ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <CreditCard className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Bugün ciro
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {formatPrice((summaryQuery.data?.revenueTodayCents ?? 0) / 100)}
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <TrendingUp className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                30 gün ciro
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {formatPrice((reportsQuery.data?.revenueCents ?? 0) / 100)}
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <Wallet className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Ortalama sipariş
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">
                {formatPrice((reportsQuery.data?.averageOrderValueCents ?? 0) / 100)}
              </p>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
              <Landmark className="h-5 w-5 text-[var(--primary-800)]/70" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                Komisyon oranı
              </p>
              <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{commissionLabel}</p>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
              <h2 className="text-2xl font-serif text-[var(--primary-800)]">Payout hattı</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                    Pending
                  </p>
                  <p className="mt-2 text-xl font-serif text-[var(--primary-800)]">{pendingCount}</p>
                </div>
                <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                    Approved
                  </p>
                  <p className="mt-2 text-xl font-serif text-[var(--primary-800)]">{approvedCount}</p>
                </div>
                <div className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                    Completed
                  </p>
                  <p className="mt-2 text-xl font-serif text-[var(--primary-800)]">{completedCount}</p>
                </div>
              </div>

              <p className="mt-4 text-xs text-[var(--neutral-600)]">
                Bekleyen ilk 6 kayıt toplamı: {formatPrice(pendingPreviewTotalCents / 100)}
              </p>

              <Link
                href="/admin/finance/payouts"
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)]"
              >
                Payout detayına git <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
              <h2 className="text-2xl font-serif text-[var(--primary-800)]">Bekleyen talepler</h2>
              {(pendingListQuery.data?.data ?? []).length === 0 ? (
                <p className="mt-4 text-sm text-[var(--neutral-600)]">Bekleyen payout talebi yok.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {(pendingListQuery.data?.data ?? []).map((row) => (
                    <div
                      key={row.id}
                      className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3"
                    >
                      <p className="text-sm font-semibold text-[var(--primary-800)]">
                        Talep #{row.id} - User #{row.beneficiaryUserId}
                      </p>
                      <p className="mt-1 text-xs text-[var(--neutral-600)]">
                        {formatPrice(row.amountCents / 100)} • {new Date(row.requestedAt).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
