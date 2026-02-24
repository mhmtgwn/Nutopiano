'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatDateTime, formatPrice } from '@/lib/format';

interface OrderRow {
  id: number;
  customerId: number;
  sellerId?: number | null;
  totalAmountCents: number;
  currency?: string;
  commissionAmountCents?: number;
  sellerNetAmountCents?: number;
  priceMismatch?: boolean;
  statusKey: string;
  source: string;
  createdByUserId: number;
  createdAt: string;
}

interface OrderItemRow {
  id: number;
  productId: number;
  variantId?: number | null;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  totalAmountCents: number;
}

interface OrderLedgerEntryRow {
  id: number;
  eventId: string;
  eventType: string;
  accountType: string;
  direction: string;
  amountCents: number;
  currency: string;
  orderId?: number | null;
  sellerId?: number | null;
  payoutRequestId?: number | null;
  metadata?: unknown;
  createdAt: string;
}

interface OrderAuditLogRow {
  id: number;
  actorRole: string;
  actorUserId: number;
  actionType: string;
  targetType: string;
  targetId: string;
  payloadJson?: unknown;
  createdAt: string;
}

interface OrderDetail extends OrderRow {
  subtotalAmountCents?: number;
  discountAmountCents?: number;
  taxAmountCents?: number;
  platformRevenueCents?: number;
  calculationProfileId?: string | null;
  calculationVersion?: string | null;
  breakdownJson?: unknown;
  priceMismatchMetaJson?: unknown;
  notes?: string | null;
  shipmentCarrier?: string | null;
  shipmentTrackingNumber?: string | null;
  items: OrderItemRow[];
  ledgerEntries?: OrderLedgerEntryRow[];
  auditLogs?: OrderAuditLogRow[];
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

type DetailTabKey = 'summary' | 'breakdown' | 'ledger' | 'audit';

const statusBadgeClassName = (statusKey: string) => {
  const key = String(statusKey ?? '').trim().toUpperCase();
  if (key.includes('NEW')) return 'bg-[#E8F1FF] text-[#0B3B91]';
  if (key.includes('PAID')) return 'bg-[#E6FBF2] text-[#0F5132]';
  if (key.includes('PREP')) return 'bg-[#FFF7E6] text-[#7A4B00]';
  if (key.includes('SHIP')) return 'bg-[#F3EEE3] text-[#3E2723]';
  if (key.includes('DELIV') || key.includes('COMP')) return 'bg-[#E6FBF2] text-[#0F5132]';
  if (key.includes('CANCEL') || key.includes('RETURN')) return 'bg-[#FDECEC] text-[#9B1C1C]';
  return 'bg-[#F3EEE3] text-[#3E2723]';
};

const channelLabel = (source: string) => {
  const key = String(source ?? '').trim().toUpperCase();
  if (key === 'POS') return 'POS';
  if (key === 'WEB' || key === 'MOBILE') return 'MARKETPLACE';
  if (key === 'API') return 'MANUAL';
  return key || '-';
};

const ledgerDirectionBadgeClassName = (direction: string) => {
  const key = String(direction ?? '').trim().toUpperCase();
  if (key === 'DEBIT') return 'bg-[#FFF7E6] text-[#7A4B00]';
  if (key === 'CREDIT') return 'bg-[#E6FBF2] text-[#0F5132]';
  return 'bg-[#F3EEE3] text-[#3E2723]';
};

const formatOptionalPrice = (value?: number | null) => {
  if (typeof value !== 'number') return '-';
  return formatPrice(value);
};

const resolveBreakdownAmount = (
  detail: OrderDetail | undefined,
  keys: string[],
  fallback?: number,
) => {
  if (!detail) return fallback;
  const candidate = detail.breakdownJson;
  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    const map = candidate as Record<string, unknown>;
    for (const key of keys) {
      const raw = map[key];
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
      if (typeof raw === 'string') {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
  }
  return fallback;
};

export default function SellerOrdersPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [source, setSource] = useState('');
  const [statusKey, setStatusKey] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTabKey>('summary');
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);
  const [isLedgerExpanded, setIsLedgerExpanded] = useState(false);

  const filters = useMemo(
    () => ({
      source: source.trim() || undefined,
      statusKey: statusKey.trim() || undefined,
      dateFrom: dateFrom.trim() || undefined,
      dateTo: dateTo.trim() || undefined,
    }),
    [source, statusKey, dateFrom, dateTo],
  );

  const ordersQuery = useQuery<PaginatedOrders>({
    queryKey: ['seller-orders-v2', { page, pageSize, ...filters }],
    queryFn: async () => {
      const res = await api.get<PaginatedOrders>('/orders', {
        params: {
          page,
          pageSize,
          ...filters,
        },
      });
      return res.data;
    },
  });

  const detailQuery = useQuery<OrderDetail>({
    queryKey: ['seller-order-detail-v2', selectedOrderId],
    enabled: typeof selectedOrderId === 'number',
    queryFn: async () => {
      const res = await api.get<OrderDetail>(`/orders/${selectedOrderId}`);
      return res.data;
    },
  });

  const orders = ordersQuery.data?.data ?? [];
  const meta = ordersQuery.data?.meta;
  const selectedOrder = detailQuery.data;

  const mismatchCount = useMemo(
    () => orders.filter((row) => Boolean(row.priceMismatch)).length,
    [orders],
  );

  const paging = useMemo(() => {
    const totalPages = meta?.totalPages ?? 1;
    return {
      canPrev: page > 1,
      canNext: page < totalPages,
      totalPages,
    };
  }, [meta?.totalPages, page]);

  const breakdown = useMemo(() => {
    const subtotal =
      resolveBreakdownAmount(selectedOrder, ['subtotalAmountCents', 'subtotal']) ??
      selectedOrder?.subtotalAmountCents ??
      0;
    const discount =
      resolveBreakdownAmount(selectedOrder, ['discountAmountCents', 'discount']) ??
      selectedOrder?.discountAmountCents ??
      0;
    const tax =
      resolveBreakdownAmount(selectedOrder, ['taxAmountCents', 'tax']) ??
      selectedOrder?.taxAmountCents ??
      0;
    const commission =
      resolveBreakdownAmount(selectedOrder, ['commissionAmountCents', 'commission']) ??
      selectedOrder?.commissionAmountCents ??
      0;
    const sellerNet =
      resolveBreakdownAmount(selectedOrder, ['sellerNetAmountCents', 'sellerNet']) ??
      selectedOrder?.sellerNetAmountCents ??
      subtotal - discount + tax - commission;

    return { subtotal, discount, tax, commission, sellerNet };
  }, [selectedOrder]);

  const openDetail = (orderId: number) => {
    setSelectedOrderId(orderId);
    setActiveTab('summary');
    setIsBreakdownExpanded(false);
    setIsLedgerExpanded(false);
  };

  const closeDetail = () => {
    setSelectedOrderId(null);
    setActiveTab('summary');
    setIsBreakdownExpanded(false);
    setIsLedgerExpanded(false);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Seller
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-serif text-[var(--primary-800)]">Orders</h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Siparis akisini, komisyonu, seller net tutarini ve mismatch flaglerini takip edin.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)]">
              Toplam: {meta?.total ?? orders.length}
            </span>
            <span
              className={`rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] ${
                mismatchCount > 0 ? 'bg-[#FDECEC] text-[#9B1C1C]' : 'bg-[#E6FBF2] text-[#0F5132]'
              }`}
            >
              Mismatch: {mismatchCount}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <div className="mb-4 grid gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4 md:grid-cols-4">
          <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-600)]">
            Channel
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setPage(1);
              }}
              className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            >
              <option value="">Tum</option>
              <option value="POS">POS</option>
              <option value="WEB">WEB</option>
              <option value="MOBILE">MOBILE</option>
              <option value="API">API</option>
            </select>
          </label>

          <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-600)]">
            Status
            <input
              value={statusKey}
              onChange={(e) => {
                setStatusKey(e.target.value);
                setPage(1);
              }}
              placeholder="CREATED"
              className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            />
          </label>

          <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-600)]">
            Date From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            />
          </label>

          <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-600)]">
            Date To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="mt-1 h-10 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            />
          </label>
        </div>

        {ordersQuery.isLoading ? <Spinner fullscreen label="Siparisler yukleniyor..." /> : null}

        {ordersQuery.isError && !ordersQuery.isLoading ? (
          <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Siparis listesi yuklenemedi.
          </div>
        ) : null}

        {!ordersQuery.isLoading && !ordersQuery.isError ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--neutral-200)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                  <th className="py-3 pr-4">Order No</th>
                  <th className="py-3 pr-4">Channel</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Total</th>
                  <th className="py-3 pr-4">Commission</th>
                  <th className="py-3 pr-4">Seller Net</th>
                  <th className="py-3 pr-4">Mismatch</th>
                  <th className="py-3">Created At</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetail(order.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') openDetail(order.id);
                    }}
                    className="cursor-pointer border-b border-[var(--neutral-100)] hover:bg-[var(--neutral-50)]"
                  >
                    <td className="py-3 pr-4 font-semibold text-[var(--primary-800)]">#{order.id}</td>
                    <td className="py-3 pr-4 text-[var(--neutral-700)]">{channelLabel(order.source)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${statusBadgeClassName(
                          order.statusKey,
                        )}`}
                      >
                        {order.statusKey}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[var(--neutral-700)]">{formatPrice(order.totalAmountCents)}</td>
                    <td className="py-3 pr-4 text-[var(--neutral-700)]">
                      {formatOptionalPrice(order.commissionAmountCents)}
                    </td>
                    <td className="py-3 pr-4 text-[var(--neutral-700)]">
                      {formatOptionalPrice(order.sellerNetAmountCents)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                          order.priceMismatch ? 'bg-[#FDECEC] text-[#9B1C1C]' : 'bg-[#E6FBF2] text-[#0F5132]'
                        }`}
                      >
                        {order.priceMismatch ? 'Flag' : 'OK'}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--neutral-600)]">{formatDateTime(order.createdAt)}</td>
                  </tr>
                ))}

                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-sm text-[var(--neutral-600)]">
                      Siparis kaydi bulunamadi.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={!paging.canPrev}
            className={`inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border px-4 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
              paging.canPrev
                ? 'border-[var(--neutral-200)] bg-white text-[var(--primary-800)] hover:bg-[var(--neutral-50)]'
                : 'cursor-not-allowed border-[var(--neutral-200)] bg-[var(--neutral-50)] text-[var(--neutral-400)]'
            }`}
          >
            Onceki
          </button>
          <div className="text-xs font-semibold text-[var(--neutral-600)]">
            Sayfa {page} / {paging.totalPages}
          </div>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(paging.totalPages, prev + 1))}
            disabled={!paging.canNext}
            className={`inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border px-4 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
              paging.canNext
                ? 'border-[var(--neutral-200)] bg-white text-[var(--primary-800)] hover:bg-[var(--neutral-50)]'
                : 'cursor-not-allowed border-[var(--neutral-200)] bg-[var(--neutral-50)] text-[var(--neutral-400)]'
            }`}
          >
            Sonraki
          </button>
        </div>
      </section>
      {selectedOrderId !== null ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Kapat"
            onClick={closeDetail}
            className="absolute inset-0 bg-black/40"
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="border-b border-[var(--neutral-200)] px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                    Order Detail
                  </p>
                  <h2 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">#{selectedOrderId}</h2>
                </div>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary-800)]"
                >
                  Kapat
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  [
                    { key: 'summary', label: 'Summary' },
                    { key: 'breakdown', label: 'Calculation Breakdown' },
                    { key: 'ledger', label: 'Ledger Entries' },
                    { key: 'audit', label: 'Audit Log' },
                  ] as Array<{ key: DetailTabKey; label: string }>
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                      activeTab === tab.key
                        ? 'border-[var(--primary-800)] bg-[var(--primary-800)] text-white'
                        : 'border-[var(--neutral-200)] bg-white text-[var(--primary-800)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 py-6">
              {detailQuery.isLoading ? <Spinner fullscreen label="Siparis detayi yukleniyor..." /> : null}

              {detailQuery.isError && !detailQuery.isLoading ? (
                <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Siparis detayi yuklenemedi.
                </div>
              ) : null}

              {!detailQuery.isLoading && !detailQuery.isError && selectedOrder ? (
                <div className="space-y-4">
                  {activeTab === 'summary' ? (
                    <>
                      <section className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--neutral-500)]">Channel</p>
                            <p className="mt-1 text-sm font-semibold text-[var(--primary-800)]">
                              {channelLabel(selectedOrder.source)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--neutral-500)]">Status</p>
                            <span
                              className={`mt-1 inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${statusBadgeClassName(
                                selectedOrder.statusKey,
                              )}`}
                            >
                              {selectedOrder.statusKey}
                            </span>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--neutral-500)]">Total</p>
                            <p className="mt-1 text-sm font-semibold text-[var(--primary-800)]">
                              {formatPrice(selectedOrder.totalAmountCents)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--neutral-500)]">Created At</p>
                            <p className="mt-1 text-sm font-semibold text-[var(--primary-800)]">
                              {formatDateTime(selectedOrder.createdAt)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--neutral-500)]">Commission</p>
                            <p className="mt-1 text-sm font-semibold text-[var(--primary-800)]">
                              {formatOptionalPrice(selectedOrder.commissionAmountCents)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--neutral-500)]">Seller Net</p>
                            <p className="mt-1 text-sm font-semibold text-[var(--primary-800)]">
                              {formatOptionalPrice(selectedOrder.sellerNetAmountCents)}
                            </p>
                          </div>
                        </div>
                        {selectedOrder.priceMismatch ? (
                          <p className="mt-3 rounded-[var(--radius-md)] bg-[#FDECEC] px-3 py-2 text-xs font-semibold text-[#9B1C1C]">
                            Price mismatch bu sipariste flaglendi.
                          </p>
                        ) : null}
                      </section>

                      <section className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                          Items
                        </p>
                        <div className="mt-3 space-y-2">
                          {selectedOrder.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-2 text-sm"
                            >
                              <div>
                                <p className="font-semibold text-[var(--primary-800)]">
                                  {item.productName}
                                </p>
                                <p className="text-xs text-[var(--neutral-600)]">
                                  Adet: {item.quantity} | Birim: {formatPrice(item.unitPriceCents)}
                                </p>
                              </div>
                              <p className="font-semibold text-[var(--primary-800)]">
                                {formatPrice(item.totalAmountCents)}
                              </p>
                            </div>
                          ))}
                          {selectedOrder.items.length === 0 ? (
                            <p className="text-sm text-[var(--neutral-600)]">Urun satiri yok.</p>
                          ) : null}
                        </div>
                      </section>
                    </>
                  ) : null}

                  {activeTab === 'breakdown' ? (
                    <section className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                        Calculation Breakdown
                      </p>
                      <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Subtotal</span>
                          <span className="font-semibold">{formatPrice(breakdown.subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>- Discount</span>
                          <span className="font-semibold text-[#7A4B00]">-{formatPrice(breakdown.discount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>+ Tax</span>
                          <span className="font-semibold">{formatPrice(breakdown.tax)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>- Commission</span>
                          <span className="font-semibold text-[#7A4B00]">
                            -{formatPrice(breakdown.commission)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-[var(--neutral-200)] pt-2">
                          <span className="font-semibold">= Seller Net</span>
                          <span className="font-semibold text-[#0F5132]">{formatPrice(breakdown.sellerNet)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsBreakdownExpanded((prev) => !prev)}
                        className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--primary-800)]"
                      >
                        {isBreakdownExpanded ? 'Detayi Gizle' : 'Detayi Goster'}
                      </button>

                      {isBreakdownExpanded ? (
                        <div className="space-y-3">
                          <div className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3 text-xs text-[var(--neutral-700)]">
                            <p>Calculation Profile: {selectedOrder.calculationProfileId || '-'}</p>
                            <p className="mt-1">Calculation Version: {selectedOrder.calculationVersion || '-'}</p>
                            <p className="mt-1">Currency: {selectedOrder.currency || 'TRY'}</p>
                          </div>

                          <div className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--neutral-500)]">
                              Breakdown Json
                            </p>
                            <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-xs text-[var(--neutral-700)]">
                              {selectedOrder.breakdownJson
                                ? JSON.stringify(selectedOrder.breakdownJson, null, 2)
                                : 'Kayit yok'}
                            </pre>
                          </div>
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                  {activeTab === 'ledger' ? (
                    <section className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                          Ledger Entries
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsLedgerExpanded((prev) => !prev)}
                          className="inline-flex h-9 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--primary-800)]"
                        >
                          {isLedgerExpanded ? 'Kapat' : 'Ac'}
                        </button>
                      </div>

                      {isLedgerExpanded ? (
                        <div className="mt-3 overflow-x-auto">
                          <table className="min-w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-[var(--neutral-200)] text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--neutral-500)]">
                                <th className="py-3 pr-3">Timestamp</th>
                                <th className="py-3 pr-3">Account</th>
                                <th className="py-3 pr-3">Direction</th>
                                <th className="py-3 pr-3">Amount</th>
                                <th className="py-3 pr-3">Type</th>
                                <th className="py-3">Reference</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(selectedOrder.ledgerEntries ?? []).map((entry) => (
                                <tr key={entry.id} className="border-b border-[var(--neutral-100)]">
                                  <td className="py-3 pr-3 text-xs text-[var(--neutral-700)]">
                                    {formatDateTime(entry.createdAt)}
                                  </td>
                                  <td className="py-3 pr-3 text-xs text-[var(--neutral-700)]">{entry.accountType}</td>
                                  <td className="py-3 pr-3">
                                    <span
                                      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${ledgerDirectionBadgeClassName(
                                        entry.direction,
                                      )}`}
                                    >
                                      {entry.direction}
                                    </span>
                                  </td>
                                  <td className="py-3 pr-3 text-xs font-semibold text-[var(--primary-800)]">
                                    {formatPrice(entry.amountCents)}
                                  </td>
                                  <td className="py-3 pr-3 text-xs text-[var(--neutral-700)]">{entry.eventType}</td>
                                  <td className="py-3 text-xs text-[var(--neutral-700)]">{entry.eventId}</td>
                                </tr>
                              ))}
                              {(selectedOrder.ledgerEntries ?? []).length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-5 text-center text-sm text-[var(--neutral-600)]">
                                    Ledger kaydi yok.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-[var(--neutral-600)]">
                          Ledger Entries varsayilan olarak kapali. Gormek icin Ac tusuna basin.
                        </p>
                      )}
                    </section>
                  ) : null}

                  {activeTab === 'audit' ? (
                    <section className="rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                        Audit Log
                      </p>
                      <div className="mt-3 space-y-2">
                        {(selectedOrder.auditLogs ?? []).map((row) => (
                          <div
                            key={row.id}
                            className="rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-3"
                          >
                            <p className="text-sm font-semibold text-[var(--primary-800)]">
                              {row.actionType} | {row.targetType}#{row.targetId}
                            </p>
                            <p className="mt-1 text-xs text-[var(--neutral-600)]">
                              {row.actorRole}#{row.actorUserId} | {formatDateTime(row.createdAt)}
                            </p>
                            {row.payloadJson ? (
                              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] border border-[var(--neutral-200)] bg-white px-2 py-2 text-xs text-[var(--neutral-700)]">
                                {JSON.stringify(row.payloadJson, null, 2)}
                              </pre>
                            ) : null}
                          </div>
                        ))}
                        {(selectedOrder.auditLogs ?? []).length === 0 ? (
                          <p className="text-sm text-[var(--neutral-600)]">Audit kaydi yok.</p>
                        ) : null}
                      </div>
                    </section>
                  ) : null}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
