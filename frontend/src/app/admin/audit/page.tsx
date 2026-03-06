'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, X } from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import FilterPanel, { type FilterField } from '@/components/common/FilterPanel';
import StatusBadge from '@/components/common/StatusBadge';

type AuditLogRow = {
  id: number;
  actorRole: string;
  actorUserId: number;
  actionType: string;
  targetType: string;
  targetId: string;
  payloadJson: Record<string, unknown> | null;
  createdAt: string;
  actorUser?: { id: number; name?: string | null; phone?: string | null } | null;
};

type PaginatedAuditLogs = {
  data: AuditLogRow[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
};

const actionVariant: Record<
  string,
  'success' | 'error' | 'warning' | 'info' | 'neutral'
> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
  LOGIN: 'neutral',
  IMPERSONATION_START: 'warning',
  IMPERSONATION_END: 'warning',
  ROLE_CHANGE: 'warning',
  PASSWORD_RESET: 'warning',
  SECURITY: 'error',
};

const filterFields: FilterField[] = [
  {
    key: 'actionType',
    label: 'Islem',
    type: 'select',
    options: [
      { label: 'CREATE', value: 'CREATE' },
      { label: 'UPDATE', value: 'UPDATE' },
      { label: 'DELETE', value: 'DELETE' },
      { label: 'LOGIN', value: 'LOGIN' },
      { label: 'IMPERSONATION_START', value: 'IMPERSONATION_START' },
      { label: 'IMPERSONATION_END', value: 'IMPERSONATION_END' },
      { label: 'ROLE_CHANGE', value: 'ROLE_CHANGE' },
    ],
  },
  {
    key: 'targetType',
    label: 'Hedef Tipi',
    type: 'select',
    options: [
      { label: 'User', value: 'User' },
      { label: 'Seller', value: 'Seller' },
      { label: 'Product', value: 'Product' },
      { label: 'Order', value: 'Order' },
      { label: 'Payment', value: 'Payment' },
    ],
  },
  { key: 'dateFrom', label: 'Baslangic', type: 'date' },
  { key: 'dateTo', label: 'Bitis', type: 'date' },
  { key: 'search', label: 'Arama', type: 'text', placeholder: 'Kullanici, hedef, islem...' },
];

export default function AuditLogPage() {
  const [filters, setFilters] = useState<Record<string, string>>({
    actionType: '',
    targetType: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  });
  const [detailModal, setDetailModal] = useState<AuditLogRow | null>(null);

  const { data, isLoading, isError } = useQuery<PaginatedAuditLogs>({
    queryKey: ['platform-audit-logs', filters.actionType, filters.targetType, filters.dateFrom, filters.dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('pageSize', '100');
      if (filters.actionType) params.set('actionType', filters.actionType);
      if (filters.targetType) params.set('targetType', filters.targetType);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      return (await api.get<PaginatedAuditLogs>(`/platform/audit/logs?${params.toString()}`)).data;
    },
  });

  const logs = useMemo(() => {
    const rows = data?.data ?? [];
    const search = (filters.search ?? '').trim().toLowerCase();
    if (!search) return rows;

    return rows.filter((row) => {
      const actor = String(row.actorUser?.name ?? row.actorUser?.phone ?? row.actorUserId).toLowerCase();
      const actionType = String(row.actionType ?? '').toLowerCase();
      const target = `${row.targetType} ${row.targetId}`.toLowerCase();
      const role = String(row.actorRole ?? '').toLowerCase();
      return actor.includes(search) || actionType.includes(search) || target.includes(search) || role.includes(search);
    });
  }, [data?.data, filters.search]);

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (filters.actionType) params.set('actionType', filters.actionType);
    if (filters.targetType) params.set('targetType', filters.targetType);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);

    try {
      const res = await api.get(`/platform/audit/logs/export?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // no-op
    }
  };

  const columns: DataTableColumn<AuditLogRow>[] = [
    {
      key: 'createdAt',
      label: 'Tarih',
      sortable: true,
      render: (row) => (
        <span className="whitespace-nowrap text-[var(--neutral-600)]">
          {new Date(row.createdAt).toLocaleString('tr-TR')}
        </span>
      ),
    },
    {
      key: 'actorUser',
      label: 'Kullanici',
      render: (row) => (
        <div>
          <p className="font-medium text-[var(--primary-800)]">
            {row.actorUser?.name ?? row.actorUser?.phone ?? `#${row.actorUserId}`}
          </p>
          <p className="text-[10px] text-[var(--neutral-500)]">{row.actorRole}</p>
        </div>
      ),
    },
    {
      key: 'actionType',
      label: 'Islem',
      render: (row) => (
        <StatusBadge variant={actionVariant[row.actionType] ?? 'neutral'} dot={false}>
          {row.actionType}
        </StatusBadge>
      ),
    },
    {
      key: 'targetType',
      label: 'Hedef',
      render: (row) => (
        <span className="text-sm text-[var(--neutral-600)]">
          {row.targetType} #{row.targetId}
        </span>
      ),
    },
  ];

  const toolbar = <FilterPanel fields={filterFields} values={filters} onChange={setFilters} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Denetim Logu</h1>
          <p className="mt-1 text-sm text-[var(--neutral-600)]">
            Platform audit kayitlari (canonical: /platform/audit/logs).
          </p>
        </div>
      </div>

      {isError ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" /> Denetim loglari alinamadi.
        </div>
      ) : null}

      <DataTable<AuditLogRow>
        columns={columns}
        data={logs}
        keyExtractor={(row) => row.id}
        loading={isLoading}
        toolbar={toolbar}
        onExport={handleExport}
        onRowClick={(row) => setDetailModal(row)}
        emptyMessage="Denetim logu kaydi bulunamadi."
      />

      {detailModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => setDetailModal(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--primary-800)]">
                Log Detayi #{detailModal.id}
              </h3>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="rounded-lg p-1 text-[var(--neutral-500)] hover:bg-[var(--neutral-100)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-[var(--neutral-500)]">Tarih:</span>{' '}
                <span className="font-medium">
                  {new Date(detailModal.createdAt).toLocaleString('tr-TR')}
                </span>
              </div>
              <div>
                <span className="text-[var(--neutral-500)]">Kullanici:</span>{' '}
                <span className="font-medium">
                  {detailModal.actorUser?.name ?? detailModal.actorUser?.phone ?? `#${detailModal.actorUserId}`}
                </span>
              </div>
              <div>
                <span className="text-[var(--neutral-500)]">Rol:</span>{' '}
                <span className="font-medium">{detailModal.actorRole}</span>
              </div>
              <div>
                <span className="text-[var(--neutral-500)]">Islem:</span>{' '}
                <span className="font-medium">{detailModal.actionType}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[var(--neutral-500)]">Hedef:</span>{' '}
                <span className="font-medium">
                  {detailModal.targetType} #{detailModal.targetId}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-1 text-xs font-semibold text-[var(--neutral-500)]">PAYLOAD JSON</p>
              <pre className="max-h-56 overflow-auto rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-3 text-xs text-[var(--neutral-700)]">
                {JSON.stringify(detailModal.payloadJson ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
