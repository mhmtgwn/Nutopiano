'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, Download, Eye, X } from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import FilterPanel, { type FilterField } from '@/components/common/FilterPanel';
import StatusBadge from '@/components/common/StatusBadge';

type AuditLogEntry = {
    id: number;
    userId: number;
    action: string;
    targetType: string | null;
    targetId: number | null;
    details: Record<string, unknown> | null;
    createdAt: string;
    user?: { name: string; role: string };
};

const actionVariant: Record<string, 'success' | 'error' | 'warning' | 'info' | 'neutral'> = {
    CREATE: 'success', UPDATE: 'info', DELETE: 'error',
    LOGIN: 'neutral', IMPERSONATION_START: 'warning', IMPERSONATION_END: 'warning',
    '2FA_RESET': 'error',
};

const filterFields: FilterField[] = [
    {
        key: 'action', label: 'İşlem', type: 'select', options: [
            { label: 'CREATE', value: 'CREATE' },
            { label: 'UPDATE', value: 'UPDATE' },
            { label: 'DELETE', value: 'DELETE' },
            { label: 'LOGIN', value: 'LOGIN' },
            { label: 'IMPERSONATION', value: 'IMPERSONATION_START' },
        ]
    },
    {
        key: 'targetType', label: 'Hedef Tipi', type: 'select', options: [
            { label: 'User', value: 'User' },
            { label: 'Product', value: 'Product' },
            { label: 'Order', value: 'Order' },
            { label: 'Seller', value: 'Seller' },
        ]
    },
    { key: 'startDate', label: 'Başlangıç', type: 'date' },
    { key: 'search', label: 'Arama', type: 'text', placeholder: 'Kullanıcı adı...' },
];

export default function AuditLogPage() {
    const [filters, setFilters] = useState<Record<string, string>>({ action: '', targetType: '', startDate: '', search: '' });
    const [detailModal, setDetailModal] = useState<AuditLogEntry | null>(null);

    const { data: logs, isLoading, isError } = useQuery<AuditLogEntry[]>({
        queryKey: ['audit-logs', filters],
        queryFn: async () => {
            try {
                const params = new URLSearchParams();
                if (filters.action) params.set('action', filters.action);
                if (filters.targetType) params.set('targetType', filters.targetType);
                if (filters.startDate) params.set('startDate', filters.startDate);
                if (filters.search) params.set('search', filters.search);
                return (await api.get<AuditLogEntry[]>(`/audit-logs?${params.toString()}`)).data;
            } catch { return []; }
        },
    });

    const handleExport = async () => {
        try {
            const res = await api.get('/audit-logs/export', { responseType: 'blob' });
            const url = URL.createObjectURL(res.data as Blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch { /* ignore */ }
    };

    const columns: DataTableColumn<AuditLogEntry>[] = [
        {
            key: 'createdAt',
            label: 'Tarih',
            sortable: true,
            render: (row) => (
                <span className="text-[var(--neutral-600)] whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleString('tr-TR')}
                </span>
            ),
        },
        {
            key: 'user',
            label: 'Kullanıcı',
            render: (row) => (
                <div>
                    <p className="font-medium text-[var(--primary-800)]">{row.user?.name ?? `#${row.userId}`}</p>
                    {row.user?.role && <p className="text-[10px] text-[var(--neutral-500)]">{row.user.role}</p>}
                </div>
            ),
        },
        {
            key: 'action',
            label: 'İşlem',
            render: (row) => (
                <StatusBadge variant={actionVariant[row.action] ?? 'neutral'} dot={false}>
                    {row.action}
                </StatusBadge>
            ),
        },
        {
            key: 'targetType',
            label: 'Hedef',
            render: (row) => (
                <span className="text-sm text-[var(--neutral-600)]">
                    {row.targetType ? `${row.targetType} #${row.targetId}` : '—'}
                </span>
            ),
        },
    ];

    const toolbar = (
        <FilterPanel fields={filterFields} values={filters} onChange={setFilters} />
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Denetim Logu</h1>
                    <p className="mt-1 text-sm text-[var(--neutral-600)]">Tüm sistem işlemlerinin denetim kayıtları.</p>
                </div>
            </div>

            {isError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4" /> Artık denetim logları alınamadı.
                </div>
            )}

            <DataTable<AuditLogEntry>
                columns={columns}
                data={logs ?? []}
                keyExtractor={(row) => row.id}
                loading={isLoading}
                toolbar={toolbar}
                onExport={handleExport}
                onRowClick={(row) => setDetailModal(row)}
                emptyMessage="Denetim logu kaydı bulunamadı."
            />

            {/* Detail Modal */}
            {detailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <button type="button" aria-label="Kapat" onClick={() => setDetailModal(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-[var(--primary-800)]">Log Detayı #{detailModal.id}</h3>
                            <button type="button" onClick={() => setDetailModal(null)} className="rounded-lg p-1 text-[var(--neutral-500)] hover:bg-[var(--neutral-100)]"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-[var(--neutral-500)]">Tarih:</span> <span className="font-medium">{new Date(detailModal.createdAt).toLocaleString('tr-TR')}</span></div>
                                <div><span className="text-[var(--neutral-500)]">Kullanıcı:</span> <span className="font-medium">{detailModal.user?.name ?? `#${detailModal.userId}`}</span></div>
                                <div><span className="text-[var(--neutral-500)]">İşlem:</span> <StatusBadge variant={actionVariant[detailModal.action] ?? 'neutral'} dot={false}>{detailModal.action}</StatusBadge></div>
                                <div><span className="text-[var(--neutral-500)]">Hedef:</span> <span className="font-medium">{detailModal.targetType} #{detailModal.targetId}</span></div>
                            </div>
                            {detailModal.details && (
                                <div>
                                    <p className="text-xs font-semibold text-[var(--neutral-500)] mb-1">DETAYLAR (JSON)</p>
                                    <pre className="max-h-48 overflow-auto rounded-lg bg-[var(--neutral-50)] p-3 text-xs text-[var(--neutral-700)] border border-[var(--neutral-200)]">
                                        {JSON.stringify(detailModal.details, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
