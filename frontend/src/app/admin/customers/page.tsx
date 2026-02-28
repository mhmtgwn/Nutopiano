'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Eye, Users } from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';

type CustomerRow = {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    balance: number;
    orderCount: number;
    totalSpent: number;
    isActive: boolean;
    createdAt: string;
};

export default function AdminCustomersPage() {
    const router = useRouter();
    const [search, setSearch] = useState('');

    const { data: customers, isLoading } = useQuery<CustomerRow[]>({
        queryKey: ['admin-customers', search],
        queryFn: async () => {
            try {
                const params = new URLSearchParams();
                if (search) params.set('search', search);
                return (await api.get<CustomerRow[]>(`/customers?${params.toString()}`)).data;
            } catch { return []; }
        },
    });

    const columns: DataTableColumn<CustomerRow>[] = [
        {
            key: 'name', label: 'Ad Soyad', sortable: true,
            render: (row) => (
                <div>
                    <p className="font-semibold text-[var(--primary-800)]">{row.name}</p>
                    {row.email && <p className="text-[10px] text-[var(--neutral-500)]">{row.email}</p>}
                </div>
            ),
        },
        {
            key: 'phone', label: 'Telefon',
            render: (row) => <span className="text-sm text-[var(--neutral-600)]">{row.phone}</span>,
        },
        {
            key: 'balance', label: 'Bakiye', sortable: true,
            render: (row) => <span className={`font-semibold ${row.balance > 0 ? 'text-emerald-600' : 'text-[var(--neutral-600)]'}`}>{row.balance.toLocaleString('tr-TR')} ₺</span>,
        },
        {
            key: 'orderCount', label: 'Sipariş', sortable: true,
            render: (row) => <span className="text-sm text-[var(--neutral-700)]">{row.orderCount ?? 0}</span>,
        },
        {
            key: 'totalSpent', label: 'Toplam Harcama', sortable: true,
            render: (row) => <span className="font-medium text-[var(--primary-800)]">{(row.totalSpent ?? 0).toLocaleString('tr-TR')} ₺</span>,
        },
        {
            key: 'isActive', label: 'Durum',
            render: (row) => <StatusBadge variant={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Aktif' : 'Pasif'}</StatusBadge>,
        },
        {
            key: 'createdAt', label: 'Kayıt Tarihi', sortable: true,
            render: (row) => <span className="text-[var(--neutral-500)]">{new Date(row.createdAt).toLocaleDateString('tr-TR')}</span>,
        },
    ];

    const rowActions = (row: CustomerRow) => (
        <button type="button" onClick={() => router.push(`/admin/customers/${row.id}`)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--primary-700)] hover:bg-[var(--neutral-100)]">
            <Eye className="h-3 w-3" /> Detay
        </button>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Müşteriler</h1>
                <p className="mt-1 text-sm text-[var(--neutral-600)]">Tüm müşteriler. Ad, telefon veya e-posta ile arayın.</p>
            </div>

            <DataTable<CustomerRow>
                columns={columns}
                data={customers ?? []}
                keyExtractor={(row) => row.id}
                loading={isLoading}
                rowActions={(row) => rowActions(row)}
                emptyMessage="Müşteri bulunamadı."
            />
        </div>
    );
}
