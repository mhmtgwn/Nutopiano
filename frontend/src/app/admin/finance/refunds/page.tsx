'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { RefreshCcw } from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import FilterPanel, { type FilterField } from '@/components/common/FilterPanel';
import StatusBadge from '@/components/common/StatusBadge';

type RefundRow = {
    id: number;
    orderId: number;
    orderNumber: string;
    customerName: string;
    sellerName: string;
    amount: number;
    reason: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
    createdAt: string;
};

const statusVariant: Record<string, 'warning' | 'success' | 'error' | 'info'> = {
    PENDING: 'warning', APPROVED: 'info', REJECTED: 'error', PROCESSED: 'success',
};
const statusLabel: Record<string, string> = { PENDING: 'Bekliyor', APPROVED: 'Onaylı', REJECTED: 'Reddedildi', PROCESSED: 'İşlendi' };

const filterFields: FilterField[] = [
    {
        key: 'status', label: 'Durum', type: 'select', options: [
            { label: 'Bekliyor', value: 'PENDING' },
            { label: 'Onaylı', value: 'APPROVED' },
            { label: 'Reddedildi', value: 'REJECTED' },
            { label: 'İşlendi', value: 'PROCESSED' },
        ]
    },
    { key: 'startDate', label: 'Başlangıç', type: 'date' },
];

const resolveApiErr = (e: unknown, f: string) => { const m = (e as any)?.response?.data?.message; return typeof m === 'string' ? m : f; };

export default function RefundsPage() {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState<Record<string, string>>({ status: '', startDate: '' });

    const { data: refunds, isLoading } = useQuery<RefundRow[]>({
        queryKey: ['admin-refunds', filters],
        queryFn: async () => {
            try {
                const params = new URLSearchParams();
                Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
                return (await api.get<RefundRow[]>(`/admin/finance/refunds?${params.toString()}`)).data;
            } catch { return []; }
        },
    });

    const processMutation = useMutation({
        mutationFn: async (p: { id: number; action: 'approve' | 'reject' }) =>
            api.post(`/admin/finance/refunds/${p.id}/${p.action}`),
        onSuccess: async () => {
            toast.success('İade durumu güncellendi.');
            await queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
        },
        onError: (err: unknown) => toast.error(resolveApiErr(err, 'İşlem başarısız.')),
    });

    const columns: DataTableColumn<RefundRow>[] = [
        {
            key: 'orderNumber', label: 'Sipariş', sortable: true,
            render: (row) => <span className="font-semibold text-[var(--primary-800)]">#{row.orderNumber}</span>,
        },
        {
            key: 'customerName', label: 'Müşteri',
            render: (row) => <span className="text-sm text-[var(--neutral-700)]">{row.customerName}</span>,
        },
        {
            key: 'sellerName', label: 'Satıcı',
            render: (row) => <span className="text-sm text-[var(--neutral-600)]">{row.sellerName}</span>,
        },
        {
            key: 'amount', label: 'Tutar', sortable: true,
            render: (row) => <span className="font-semibold text-red-600">{row.amount.toLocaleString('tr-TR')} ₺</span>,
        },
        {
            key: 'status', label: 'Durum',
            render: (row) => <StatusBadge variant={statusVariant[row.status] ?? 'neutral'}>{statusLabel[row.status] ?? row.status}</StatusBadge>,
        },
        {
            key: 'createdAt', label: 'Tarih', sortable: true,
            render: (row) => <span className="text-[var(--neutral-500)]">{new Date(row.createdAt).toLocaleDateString('tr-TR')}</span>,
        },
    ];

    const rowActions = (row: RefundRow) =>
        row.status === 'PENDING' ? (
            <div className="flex items-center gap-1">
                <button type="button" onClick={() => processMutation.mutate({ id: row.id, action: 'approve' })}
                    disabled={processMutation.isPending}
                    className="rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50">
                    Onayla
                </button>
                <button type="button" onClick={() => processMutation.mutate({ id: row.id, action: 'reject' })}
                    disabled={processMutation.isPending}
                    className="rounded-md px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50">
                    Reddet
                </button>
            </div>
        ) : null;

    const toolbar = <FilterPanel fields={filterFields} values={filters} onChange={setFilters} />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">İade Talepleri</h1>
                <p className="mt-1 text-sm text-[var(--neutral-600)]">Sipariş iade taleplerini yönetin. Onayla veya reddedin.</p>
            </div>

            <DataTable<RefundRow>
                columns={columns}
                data={refunds ?? []}
                keyExtractor={(row) => row.id}
                loading={isLoading}
                toolbar={toolbar}
                rowActions={(row) => rowActions(row)}
                emptyMessage="İade talebi bulunamadı."
            />
        </div>
    );
}
