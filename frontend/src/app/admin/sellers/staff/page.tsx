'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import FilterPanel, { type FilterField } from '@/components/common/FilterPanel';
import StatusBadge from '@/components/common/StatusBadge';
import { normalizeRole } from '@/lib/role-routing';

type StaffRole = 'SELLER' | 'SELLER_STAFF';

type StaffRow = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  role: StaffRole;
  sellerName: string;
  sellerId: number;
  permissionCount: number;
  isActive: boolean;
  createdAt: string;
};

type SellerStaffApiRow = {
  id: number;
  userId: number;
  sellerId: number;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  user: {
    id: number;
    name: string | null;
    phone: string | null;
    email: string | null;
    role: string;
  };
  seller: {
    id: number;
    displayName: string;
    slug: string;
    isActive: boolean;
  };
};

type PaginatedSellerStaffResponse = {
  data: SellerStaffApiRow[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
};

const filterFields: FilterField[] = [
  {
    key: 'role',
    label: 'Rol',
    type: 'select',
    options: [
      { label: 'Satici', value: 'SELLER' },
      { label: 'Satici Personeli', value: 'SELLER_STAFF' },
    ],
  },
  {
    key: 'isActive',
    label: 'Durum',
    type: 'select',
    options: [
      { label: 'Aktif', value: 'true' },
      { label: 'Pasif', value: 'false' },
    ],
  },
  { key: 'search', label: 'Arama', type: 'text', placeholder: 'Isim, telefon, e-posta...' },
];

const toStaffRole = (role: string): StaffRole => {
  const normalized = normalizeRole(role);
  return normalized === 'SELLER' ? 'SELLER' : 'SELLER_STAFF';
};

export default function SellerStaffPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<string, string>>({
    role: '',
    isActive: '',
    search: '',
  });

  const { data, isLoading } = useQuery<PaginatedSellerStaffResponse>({
    queryKey: ['platform-seller-staff'],
    queryFn: async () =>
      (await api.get<PaginatedSellerStaffResponse>('/platform/sellers/staff?page=1&pageSize=200')).data,
  });

  const staff = useMemo<StaffRow[]>(() => {
    const rows = data?.data ?? [];
    const mapped = rows.map<StaffRow>((row) => ({
      id: row.user.id,
      name: row.user.name ?? `Kullanici #${row.user.id}`,
      phone: row.user.phone ?? '-',
      email: row.user.email ?? null,
      role: toStaffRole(row.user.role),
      sellerName: row.seller.displayName,
      sellerId: row.seller.id,
      permissionCount: Array.isArray(row.permissions) ? row.permissions.length : 0,
      isActive: row.isActive,
      createdAt: row.createdAt,
    }));

    return mapped.filter((row) => {
      if (filters.role && row.role !== filters.role) return false;
      if (filters.isActive === 'true' && !row.isActive) return false;
      if (filters.isActive === 'false' && row.isActive) return false;

      const q = (filters.search ?? '').trim().toLowerCase();
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q) ||
        (row.email ?? '').toLowerCase().includes(q) ||
        row.sellerName.toLowerCase().includes(q)
      );
    });
  }, [data?.data, filters.isActive, filters.role, filters.search]);

  const columns: DataTableColumn<StaffRow>[] = [
    {
      key: 'name',
      label: 'Kullanici',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold text-[var(--primary-800)]">{row.name}</p>
          {row.email ? <p className="text-[10px] text-[var(--neutral-500)]">{row.email}</p> : null}
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Telefon',
      render: (row) => <span className="text-sm text-[var(--neutral-600)]">{row.phone}</span>,
    },
    {
      key: 'sellerName',
      label: 'Satici',
      render: (row) => (
        <button
          type="button"
          onClick={() => router.push(`/admin/sellers/${row.sellerId}`)}
          className="text-sm font-medium text-[var(--primary-700)] hover:underline"
        >
          {row.sellerName}
        </button>
      ),
    },
    {
      key: 'role',
      label: 'Rol',
      render: (row) => (
        <StatusBadge variant={row.role === 'SELLER' ? 'info' : 'warning'} dot={false}>
          {row.role === 'SELLER' ? 'Satici' : 'Satici Personeli'}
        </StatusBadge>
      ),
    },
    {
      key: 'permissionCount',
      label: 'Yetki',
      render: (row) => (
        <span className="text-sm text-[var(--neutral-600)]">{row.permissionCount} izin</span>
      ),
    },
    {
      key: 'isActive',
      label: 'Durum',
      render: (row) => (
        <StatusBadge variant={row.isActive ? 'success' : 'neutral'}>
          {row.isActive ? 'Aktif' : 'Pasif'}
        </StatusBadge>
      ),
    },
  ];

  const toolbar = <FilterPanel fields={filterFields} values={filters} onChange={setFilters} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">
          Satici Kullanici Listesi
        </h1>
        <p className="mt-1 text-sm text-[var(--neutral-600)]">
          Tum seller/staff kayitlari (canonical: /platform/sellers/staff).
        </p>
      </div>

      <DataTable<StaffRow>
        columns={columns}
        data={staff}
        keyExtractor={(row) => row.id}
        loading={isLoading}
        toolbar={toolbar}
        emptyMessage="Satici kullanicisi bulunamadi."
      />
    </div>
  );
}
