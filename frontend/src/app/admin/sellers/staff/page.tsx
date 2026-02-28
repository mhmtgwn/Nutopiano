'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import FilterPanel, { type FilterField } from '@/components/common/FilterPanel';
import StatusBadge from '@/components/common/StatusBadge';

type StaffRow = {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    role: string;
    sellerName: string;
    sellerId: number;
    permissionGroupName?: string;
    isActive: boolean;
    lastLoginAt: string | null;
};

const filterFields: FilterField[] = [
    {
        key: 'role', label: 'Rol', type: 'select', options: [
            { label: 'Seller', value: 'SELLER' },
            { label: 'Staff', value: 'USER' },
        ]
    },
    {
        key: 'isActive', label: 'Durum', type: 'select', options: [
            { label: 'Aktif', value: 'true' },
            { label: 'Pasif', value: 'false' },
        ]
    },
];

export default function SellerStaffPage() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState<Record<string, string>>({ role: '', isActive: '' });

    const { data: staff, isLoading } = useQuery<StaffRow[]>({
        queryKey: ['seller-staff', search, filters],
        queryFn: async () => {
            try {
                const params = new URLSearchParams();
                if (search) params.set('search', search);
                Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
                return (await api.get<StaffRow[]>(`/admin/sellers/staff?${params.toString()}`)).data;
            } catch { return []; }
        },
    });

    const columns: DataTableColumn<StaffRow>[] = [
        {
            key: 'name', label: 'Kullanıcı', sortable: true,
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
            key: 'sellerName', label: 'Satıcı',
            render: (row) => (
                <button type="button" onClick={() => router.push(`/admin/sellers/${row.sellerId}`)}
                    className="text-sm font-medium text-[var(--primary-700)] hover:underline">
                    {row.sellerName}
                </button>
            ),
        },
        {
            key: 'role', label: 'Rol',
            render: (row) => (
                <StatusBadge variant={row.role === 'SELLER' ? 'info' : 'neutral'} dot={false}>
                    {row.role === 'SELLER' ? 'Satıcı' : 'Personel'}
                </StatusBadge>
            ),
        },
        {
            key: 'permissionGroupName', label: 'Yetki Grubu',
            render: (row) => <span className="text-sm text-[var(--neutral-600)]">{row.permissionGroupName ?? '—'}</span>,
        },
        {
            key: 'isActive', label: 'Durum',
            render: (row) => <StatusBadge variant={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Aktif' : 'Pasif'}</StatusBadge>,
        },
        {
            key: 'lastLoginAt', label: 'Son Giriş',
            render: (row) => <span className="text-[var(--neutral-500)]">{row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleDateString('tr-TR') : '—'}</span>,
        },
    ];

    const toolbar = <FilterPanel fields={filterFields} values={filters} onChange={setFilters} />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Satıcı Kullanıcıları</h1>
                <p className="mt-1 text-sm text-[var(--neutral-600)]">Tüm satıcıların personeli. Satıcıya göre filtreleyin, yetki grubu atayın.</p>
            </div>

            <DataTable<StaffRow>
                columns={columns}
                data={staff ?? []}
                keyExtractor={(row) => row.id}
                loading={isLoading}
                toolbar={toolbar}
                emptyMessage="Satıcı kullanıcısı bulunamadı."
            />
        </div>
    );
}
