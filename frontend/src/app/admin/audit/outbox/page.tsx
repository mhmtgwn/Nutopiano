'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { RefreshCcw } from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import FilterPanel, { type FilterField } from '@/components/common/FilterPanel';
import StatusBadge from '@/components/common/StatusBadge';

type OutboxEvent = {
    id: number;
    eventType: string;
    status: 'PENDING' | 'PROCESSED' | 'DEAD_LETTER';
    attemptCount: number;
    maxAttempts: number;
    payload: Record<string, unknown>;
    errorMessage: string | null;
    createdAt: string;
    processedAt: string | null;
};

const statusVariant: Record<string, 'warning' | 'success' | 'error'> = { PENDING: 'warning', PROCESSED: 'success', DEAD_LETTER: 'error' };
const statusLabel: Record<string, string> = { PENDING: 'Bekliyor', PROCESSED: 'İşlendi', DEAD_LETTER: 'Dead Letter' };

const filterFields: FilterField[] = [
    {
        key: 'status', label: 'Durum', type: 'select', options: [
            { label: 'Bekliyor', value: 'PENDING' },
            { label: 'İşlendi', value: 'PROCESSED' },
            { label: 'Dead Letter', value: 'DEAD_LETTER' },
        ]
    },
    { key: 'eventType', label: 'Olay Tipi', type: 'text' },
];

const resolveApiErr = (e: unknown, f: string) => { const m = (e as any)?.response?.data?.message; return typeof m === 'string' ? m : f; };

export default function OutboxEventsPage() {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState<Record<string, string>>({ status: '', eventType: '' });

    const { data: events, isLoading } = useQuery<OutboxEvent[]>({
        queryKey: ['outbox-events', filters],
        queryFn: async () => {
            try {
                const params = new URLSearchParams();
                Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
                return (await api.get<OutboxEvent[]>(`/outbox-events?${params.toString()}`)).data;
            } catch { return []; }
        },
    });

    const retryMutation = useMutation({
        mutationFn: async (id: number) => api.post(`/outbox-events/${id}/retry`),
        onSuccess: async () => {
            toast.success('Yeniden deneme kuyruğa eklendi.');
            await queryClient.invalidateQueries({ queryKey: ['outbox-events'] });
        },
        onError: (err: unknown) => toast.error(resolveApiErr(err, 'İşlem başarısız.')),
    });

    const columns: DataTableColumn<OutboxEvent>[] = [
        {
            key: 'eventType', label: 'Olay Tipi', sortable: true,
            render: (row) => <span className="font-mono text-sm font-medium text-[var(--primary-800)]">{row.eventType}</span>,
        },
        {
            key: 'status', label: 'Durum',
            render: (row) => <StatusBadge variant={statusVariant[row.status] ?? 'neutral'}>{statusLabel[row.status] ?? row.status}</StatusBadge>,
        },
        {
            key: 'attemptCount', label: 'Deneme',
            render: (row) => (
                <span className={`text-sm font-medium ${row.attemptCount >= row.maxAttempts ? 'text-red-600' : 'text-[var(--neutral-600)]'}`}>
                    {row.attemptCount}/{row.maxAttempts}
                </span>
            ),
        },
        {
            key: 'errorMessage', label: 'Hata',
            render: (row) => (
                <span className="text-xs text-red-600 truncate block max-w-[200px]" title={row.errorMessage ?? undefined}>
                    {row.errorMessage ?? '—'}
                </span>
            ),
        },
        {
            key: 'createdAt', label: 'Oluşturma', sortable: true,
            render: (row) => <span className="text-[var(--neutral-500)]">{new Date(row.createdAt).toLocaleString('tr-TR')}</span>,
        },
        {
            key: 'processedAt', label: 'İşlenme',
            render: (row) => <span className="text-[var(--neutral-500)]">{row.processedAt ? new Date(row.processedAt).toLocaleString('tr-TR') : '—'}</span>,
        },
    ];

    const rowActions = (row: OutboxEvent) =>
        (row.status === 'DEAD_LETTER' || row.status === 'PENDING') ? (
            <button type="button" onClick={() => retryMutation.mutate(row.id)}
                disabled={retryMutation.isPending}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50">
                <RefreshCcw className="h-3 w-3" /> Yeniden Dene
            </button>
        ) : null;

    const pendingCount = (events ?? []).filter(e => e.status === 'PENDING').length;
    const deadCount = (events ?? []).filter(e => e.status === 'DEAD_LETTER').length;
    const toolbar = <FilterPanel fields={filterFields} values={filters} onChange={setFilters} />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Outbox Olayları</h1>
                <p className="mt-1 text-sm text-[var(--neutral-600)]">Event-driven mimari outbox kayıtları. Dead letter yönetimi.</p>
            </div>

            <div className="flex gap-3">
                {pendingCount > 0 && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700">
                        <strong>{pendingCount}</strong> bekleyen olay
                    </div>
                )}
                {deadCount > 0 && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
                        <strong>{deadCount}</strong> dead letter
                    </div>
                )}
            </div>

            <DataTable<OutboxEvent>
                columns={columns}
                data={events ?? []}
                keyExtractor={(row) => row.id}
                loading={isLoading}
                toolbar={toolbar}
                rowActions={(row) => rowActions(row)}
                emptyMessage="Outbox olayı bulunamadı."
            />
        </div>
    );
}
