'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Eye, ShoppingCart } from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import FilterPanel, { type FilterField } from '@/components/common/FilterPanel';
import StatusBadge from '@/components/common/StatusBadge';

type OrderRow = {
    id: number;
    orderNumber: string;
    customerName: string;
    sellerName: string;
    totalAmount: number;
    status: string;
    source: string;
    createdAt: string;
};

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    PENDING: 'warning', CONFIRMED: 'info', PREPARING: 'info',
    SHIPPED: 'info', DELIVERED: 'success', CANCELLED: 'error', RETURNED: 'error',
};

const filterFields: FilterField[] = [
    {
        key: 'status', label: 'Durum', type: 'select', options: [
            { label: 'Bekliyor', value: 'PENDING' },
            { label: 'Onaylandı', value: 'CONFIRMED' },
            { label: 'Hazırlanıyor', value: 'PREPARING' },
            { label: 'Kargoda', value: 'SHIPPED' },
            { label: 'Teslim Edildi', value: 'DELIVERED' },
            { label: 'İptal', value: 'CANCELLED' },
        ]
    },
    {
        key: 'source', label: 'Kaynak', type: 'select', options: [
            { label: 'Web', value: 'WEB' },
            { label: 'POS', value: 'POS' },
            { label: 'API', value: 'API' },
        ]
    },
    { key: 'startDate', label: 'Başlangıç', type: 'date' },
    { key: 'endDate', label: 'Bitiş', type: 'date' },
];

export default function AdminOrdersPage() {
    const router = useRouter();
    const [filters, setFilters] = useState<Record<string, string>>({ status: '', source: '', startDate: '', endDate: '' });
    const [search, setSearch] = useState('');

    const { data: orders, isLoading } = useQuery<OrderRow[]>({
        queryKey: ['admin-orders', filters, search],
        queryFn: async () => {
            try {
                const params = new URLSearchParams();
                Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
                if (search) params.set('search', search);
                return (await api.get<OrderRow[]>(`/orders?${params.toString()}`)).data;
            } catch { return []; }
        },
    });

    const columns: DataTableColumn<OrderRow>[] = [
        {
            key: 'orderNumber', label: 'Sipariş No', sortable: true,
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
            key: 'totalAmount', label: 'Tutar', sortable: true,
            render: (row) => <span className="font-semibold text-[var(--primary-800)]">{row.totalAmount?.toLocaleString('tr-TR')} ₺</span>,
        },
        {
            key: 'status', label: 'Durum',
            render: (row) => <StatusBadge variant={statusVariant[row.status] ?? 'neutral'}>{row.status}</StatusBadge>,
        },
        {
            key: 'source', label: 'Kaynak',
            render: (row) => (
                <span className="rounded bg-[var(--neutral-100)] px-2 py-0.5 text-[10px] font-medium text-[var(--neutral-600)]">{row.source ?? 'WEB'}</span>
            ),
        },
        {
            key: 'createdAt', label: 'Tarih', sortable: true,
            render: (row) => <span className="text-[var(--neutral-500)]">{new Date(row.createdAt).toLocaleDateString('tr-TR')}</span>,
        },
    ];

    const rowActions = (row: OrderRow) => (
        <button type="button" onClick={() => router.push(`/admin/orders/${row.id}`)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--primary-700)] hover:bg-[var(--neutral-100)]">
            <Eye className="h-3 w-3" /> Detay
        </button>
    );

    const toolbar = <FilterPanel fields={filterFields} values={filters} onChange={setFilters} />;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Siparişler</h1>
                    <p className="mt-1 text-sm text-[var(--neutral-600)]">Tüm satıcıların siparişleri. Durum, kaynak ve tarih bazlı filtreleme.</p>
                </div>
            </div>

            <DataTable<OrderRow>
                columns={columns}
                data={orders ?? []}
                keyExtractor={(row) => row.id}
                loading={isLoading}
                toolbar={toolbar}
                rowActions={(row) => rowActions(row)}
                emptyMessage="Sipariş bulunamadı."
            />
        </div>
    );
}
