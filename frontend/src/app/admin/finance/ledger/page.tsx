'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Download, X } from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import FilterPanel, { type FilterField } from '@/components/common/FilterPanel';
import StatusBadge from '@/components/common/StatusBadge';

type LedgerEntry = {
    id: number;
    eventType: string;
    accountType: string;
    direction: 'DEBIT' | 'CREDIT';
    amount: number;
    currency: string;
    orderId: number | null;
    sellerId: number | null;
    sellerName?: string;
    description: string | null;
    createdAt: string;
    details?: Record<string, unknown>;
};

const eventLabels: Record<string, string> = {
    ORDER_PAYMENT: 'Sipariş Ödemesi', COMMISSION: 'Komisyon', PAYOUT: 'Payout',
    REFUND: 'İade', MANUAL_ADJUSTMENT: 'Manuel Düzeltme', PLATFORM_FEE: 'Platform Ücreti',
};

const filterFields: FilterField[] = [
    {
        key: 'eventType', label: 'Olay Tipi', type: 'select', options: [
            { label: 'Sipariş Ödemesi', value: 'ORDER_PAYMENT' },
            { label: 'Komisyon', value: 'COMMISSION' },
            { label: 'Payout', value: 'PAYOUT' },
            { label: 'İade', value: 'REFUND' },
            { label: 'Manuel Düzeltme', value: 'MANUAL_ADJUSTMENT' },
        ]
    },
    {
        key: 'accountType', label: 'Hesap Tipi', type: 'select', options: [
            { label: 'Satıcı', value: 'SELLER' },
            { label: 'Platform', value: 'PLATFORM' },
            { label: 'Müşteri', value: 'CUSTOMER' },
        ]
    },
    { key: 'startDate', label: 'Başlangıç', type: 'date' },
    { key: 'endDate', label: 'Bitiş', type: 'date' },
];

export default function LedgerPage() {
    const [filters, setFilters] = useState<Record<string, string>>({ eventType: '', accountType: '', startDate: '', endDate: '' });
    const [detailEntry, setDetailEntry] = useState<LedgerEntry | null>(null);

    const { data: entries, isLoading } = useQuery<LedgerEntry[]>({
        queryKey: ['ledger', filters],
        queryFn: async () => {
            try {
                const params = new URLSearchParams();
                Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
                return (await api.get<LedgerEntry[]>(`/admin/finance/ledger?${params.toString()}`)).data;
            } catch { return []; }
        },
    });

    const handleExport = async () => {
        try {
            const res = await api.get('/admin/finance/ledger/export', { responseType: 'blob' });
            const url = URL.createObjectURL(res.data as Blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click(); URL.revokeObjectURL(url);
        } catch { /* */ }
    };

    const columns: DataTableColumn<LedgerEntry>[] = [
        {
            key: 'createdAt', label: 'Tarih', sortable: true,
            render: (row) => <span className="text-[var(--neutral-600)] whitespace-nowrap">{new Date(row.createdAt).toLocaleString('tr-TR')}</span>,
        },
        {
            key: 'eventType', label: 'Olay Tipi',
            render: (row) => <StatusBadge variant="info" dot={false}>{eventLabels[row.eventType] ?? row.eventType}</StatusBadge>,
        },
        {
            key: 'accountType', label: 'Hesap',
            render: (row) => <span className="text-sm text-[var(--neutral-600)]">{row.accountType}</span>,
        },
        {
            key: 'direction', label: 'Yön',
            render: (row) => (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${row.direction === 'CREDIT' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {row.direction === 'CREDIT' ? 'ALACAK' : 'BORÇ'}
                </span>
            ),
        },
        {
            key: 'amount', label: 'Tutar', sortable: true,
            render: (row) => (
                <span className={`font-semibold ${row.direction === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {row.direction === 'CREDIT' ? '+' : '-'}{row.amount.toLocaleString('tr-TR')} ₺
                </span>
            ),
        },
        {
            key: 'orderId', label: 'Sipariş',
            render: (row) => row.orderId ? <span className="text-sm text-[var(--primary-700)] font-medium">#{row.orderId}</span> : <span className="text-[var(--neutral-400)]">—</span>,
        },
        {
            key: 'sellerName', label: 'Satıcı',
            render: (row) => <span className="text-sm text-[var(--neutral-600)]">{row.sellerName ?? '—'}</span>,
        },
    ];

    const toolbar = (
        <FilterPanel fields={filterFields} values={filters} onChange={setFilters} />
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Ledger Kayıtları</h1>
                    <p className="mt-1 text-sm text-[var(--neutral-600)]">Tüm finansal hareketlerin çift kayıt (borç/alacak) detayları.</p>
                </div>
            </div>

            <DataTable<LedgerEntry>
                columns={columns}
                data={entries ?? []}
                keyExtractor={(row) => row.id}
                loading={isLoading}
                toolbar={toolbar}
                onExport={handleExport}
                onRowClick={(row) => setDetailEntry(row)}
                emptyMessage="Ledger kaydı bulunamadı."
            />

            {detailEntry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <button type="button" aria-label="Kapat" onClick={() => setDetailEntry(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-[var(--primary-800)]">Ledger Detay #{detailEntry.id}</h3>
                            <button type="button" onClick={() => setDetailEntry(null)} className="rounded-lg p-1 text-[var(--neutral-500)] hover:bg-[var(--neutral-100)]"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div><span className="text-[var(--neutral-500)]">Olay:</span> <span className="font-medium">{eventLabels[detailEntry.eventType] ?? detailEntry.eventType}</span></div>
                            <div><span className="text-[var(--neutral-500)]">Yön:</span> <span className={`font-semibold ${detailEntry.direction === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>{detailEntry.direction === 'CREDIT' ? 'ALACAK' : 'BORÇ'}</span></div>
                            <div><span className="text-[var(--neutral-500)]">Tutar:</span> <span className="font-semibold">{detailEntry.amount.toLocaleString('tr-TR')} ₺</span></div>
                            <div><span className="text-[var(--neutral-500)]">Hesap:</span> <span className="font-medium">{detailEntry.accountType}</span></div>
                            <div><span className="text-[var(--neutral-500)]">Sipariş:</span> <span className="font-medium">{detailEntry.orderId ?? '—'}</span></div>
                            <div><span className="text-[var(--neutral-500)]">Satıcı:</span> <span className="font-medium">{detailEntry.sellerName ?? '—'}</span></div>
                        </div>
                        {detailEntry.description && <p className="text-sm text-[var(--neutral-600)] mb-3">{detailEntry.description}</p>}
                        {detailEntry.details && (
                            <pre className="max-h-48 overflow-auto rounded-lg bg-[var(--neutral-50)] p-3 text-xs text-[var(--neutral-700)] border border-[var(--neutral-200)]">
                                {JSON.stringify(detailEntry.details, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
