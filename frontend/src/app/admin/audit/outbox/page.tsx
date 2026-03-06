'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { RefreshCcw } from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import FilterPanel, { type FilterField } from '@/components/common/FilterPanel';
import StatusBadge from '@/components/common/StatusBadge';

type OutboxEventRow = {
  id: number;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  idempotencyKey: string | null;
  payloadJson: Record<string, unknown> | null;
  attemptCount: number;
  nextRetryAt: string | null;
  lastError: string | null;
  deadLetteredAt: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PaginatedOutbox = {
  data: OutboxEventRow[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
};

type OutboxStatus = 'PENDING' | 'RETRY' | 'PROCESSED' | 'DEAD_LETTER';

const resolveStatus = (row: OutboxEventRow): OutboxStatus => {
  if (row.deadLetteredAt) return 'DEAD_LETTER';
  if (row.processedAt) return 'PROCESSED';
  if (row.attemptCount > 0) return 'RETRY';
  return 'PENDING';
};

const statusVariant: Record<OutboxStatus, 'warning' | 'success' | 'error' | 'info'> = {
  PENDING: 'warning',
  RETRY: 'info',
  PROCESSED: 'success',
  DEAD_LETTER: 'error',
};

const statusLabel: Record<OutboxStatus, string> = {
  PENDING: 'Bekliyor',
  RETRY: 'Tekrar Deneme',
  PROCESSED: 'Islendi',
  DEAD_LETTER: 'Dead Letter',
};

const filterFields: FilterField[] = [
  {
    key: 'status',
    label: 'Durum',
    type: 'select',
    options: [
      { label: 'Bekliyor', value: 'PENDING' },
      { label: 'Tekrar Deneme', value: 'RETRY' },
      { label: 'Islendi', value: 'PROCESSED' },
      { label: 'Dead Letter', value: 'DEAD_LETTER' },
    ],
  },
  { key: 'eventType', label: 'Event Type', type: 'text' },
];

const resolveApiErr = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.map(String).join(', ');
  if (typeof message === 'string') return message;
  return fallback;
};

export default function OutboxEventsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Record<string, string>>({
    status: '',
    eventType: '',
  });

  const { data, isLoading } = useQuery<PaginatedOutbox>({
    queryKey: ['platform-outbox-events'],
    queryFn: async () =>
      (await api.get<PaginatedOutbox>('/platform/outbox/events?page=1&pageSize=120')).data,
  });

  const events = useMemo(() => {
    const rows = data?.data ?? [];
    return rows.filter((row) => {
      const status = resolveStatus(row);
      if (filters.status && status !== filters.status) return false;
      if (filters.eventType) {
        const q = filters.eventType.trim().toLowerCase();
        if (!row.eventType.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data?.data, filters.eventType, filters.status]);

  const retryMutation = useMutation({
    mutationFn: async (id: number) => api.post(`/platform/outbox/events/${id}/retry`),
    onSuccess: async () => {
      toast.success('Yeniden deneme kuyruğa eklendi.');
      await queryClient.invalidateQueries({ queryKey: ['platform-outbox-events'] });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErr(error, 'Islem basarisiz.'));
    },
  });

  const columns: DataTableColumn<OutboxEventRow>[] = [
    {
      key: 'eventType',
      label: 'Event',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-mono text-sm font-medium text-[var(--primary-800)]">{row.eventType}</p>
          <p className="text-[10px] text-[var(--neutral-500)]">
            {row.aggregateType}#{row.aggregateId}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Durum',
      render: (row) => {
        const status = resolveStatus(row);
        return (
          <StatusBadge variant={statusVariant[status]}>{statusLabel[status]}</StatusBadge>
        );
      },
    },
    {
      key: 'attemptCount',
      label: 'Deneme',
      render: (row) => (
        <span className="text-sm font-medium text-[var(--neutral-600)]">{row.attemptCount}</span>
      ),
    },
    {
      key: 'lastError',
      label: 'Son Hata',
      render: (row) => (
        <span
          className="block max-w-[240px] truncate text-xs text-red-600"
          title={row.lastError ?? undefined}
        >
          {row.lastError ?? '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Olusturma',
      sortable: true,
      render: (row) => (
        <span className="text-[var(--neutral-500)]">
          {new Date(row.createdAt).toLocaleString('tr-TR')}
        </span>
      ),
    },
    {
      key: 'processedAt',
      label: 'Islenme',
      render: (row) => (
        <span className="text-[var(--neutral-500)]">
          {row.processedAt ? new Date(row.processedAt).toLocaleString('tr-TR') : '—'}
        </span>
      ),
    },
  ];

  const rowActions = (row: OutboxEventRow) => {
    const status = resolveStatus(row);
    if (status !== 'PENDING' && status !== 'DEAD_LETTER' && status !== 'RETRY') return null;

    return (
      <button
        type="button"
        onClick={() => retryMutation.mutate(row.id)}
        disabled={retryMutation.isPending}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50"
      >
        <RefreshCcw className="h-3 w-3" /> Yeniden Dene
      </button>
    );
  };

  const pendingCount = events.filter((row) => resolveStatus(row) === 'PENDING').length;
  const deadLetterCount = events.filter((row) => resolveStatus(row) === 'DEAD_LETTER').length;
  const toolbar = <FilterPanel fields={filterFields} values={filters} onChange={setFilters} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Outbox Olaylari</h1>
        <p className="mt-1 text-sm text-[var(--neutral-600)]">
          Event-driven outbox akisi (canonical: /platform/outbox/events).
        </p>
      </div>

      <div className="flex gap-3">
        {pendingCount > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
            <strong>{pendingCount}</strong> bekleyen olay
          </div>
        ) : null}
        {deadLetterCount > 0 ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            <strong>{deadLetterCount}</strong> dead letter
          </div>
        ) : null}
      </div>

      <DataTable<OutboxEventRow>
        columns={columns}
        data={events}
        keyExtractor={(row) => row.id}
        loading={isLoading}
        toolbar={toolbar}
        rowActions={rowActions}
        emptyMessage="Outbox olayi bulunamadi."
      />
    </div>
  );
}
