'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    AlertTriangle,
    Check,
    KeyRound,
    Lock,
    Plus,
    Trash2,
    Users,
    X,
} from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';

/* ── Types ── */
type PermissionGroup = {
    id: number;
    name: string;
    description: string | null;
    permissions: string[];
    isSystem: boolean;
    isActive: boolean;
    _count: { userAssignments: number };
    createdAt: string;
};

/* ── Permission Categories for visual grouping ── */
const permissionCategories: Record<string, { label: string; permissions: string[] }> = {
    products: {
        label: 'Ürün Yönetimi',
        permissions: ['products.view', 'products.create', 'products.edit', 'products.delete', 'products.publish', 'products.stock', 'products.import', 'products.archive'],
    },
    orders: {
        label: 'Sipariş Yönetimi',
        permissions: ['orders.view', 'orders.view_all', 'orders.create', 'orders.edit', 'orders.status_update', 'orders.cancel', 'orders.return.process'],
    },
    customers: {
        label: 'Müşteri Yönetimi',
        permissions: ['customers.view', 'customers.create', 'customers.edit', 'customers.delete', 'customers.credit.manage'],
    },
    pos: {
        label: 'POS İşlemleri',
        permissions: ['pos.sales', 'pos.orders', 'pos.reports', 'pos.register.open', 'pos.register.close', 'pos.return', 'pos.discount', 'pos.override_price', 'pos.cash_drawer', 'pos.refund_without_manager', 'pos.view_margin'],
    },
    finance: {
        label: 'Finans',
        permissions: ['finance.view', 'finance.ledger.view', 'finance.wallets.view', 'finance.payout.view', 'finance.refund.process', 'finance.report.export'],
    },
    reports: {
        label: 'Raporlar',
        permissions: ['reports.view', 'reports.export'],
    },
};

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
    const msg = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
    if (Array.isArray(msg)) return msg.map(String).join(', ');
    if (typeof msg === 'string') return msg;
    return fallback;
};

export default function PermissionGroupsPage() {
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [editGroup, setEditGroup] = useState<PermissionGroup | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<PermissionGroup | null>(null);

    const { data: groups, isLoading, isError } = useQuery<PermissionGroup[]>({
        queryKey: ['permission-groups'],
        queryFn: async () => (await api.get<PermissionGroup[]>('/permission-groups')).data,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => api.delete(`/permission-groups/${id}`),
        onSuccess: async () => {
            toast.success('Yetki grubu silindi.');
            setDeleteTarget(null);
            await queryClient.invalidateQueries({ queryKey: ['permission-groups'] });
        },
        onError: (err: unknown) => toast.error(resolveApiErrorMessage(err, 'Silme başarısız.')),
    });

    const columns: DataTableColumn<PermissionGroup>[] = [
        {
            key: 'name',
            label: 'Grup Adı',
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${row.isSystem ? 'bg-purple-50' : 'bg-[var(--neutral-100)]'}`}>
                        {row.isSystem ? <Lock className="h-3.5 w-3.5 text-purple-500" /> : <KeyRound className="h-3.5 w-3.5 text-[var(--neutral-500)]" />}
                    </div>
                    <div>
                        <p className="font-semibold text-[var(--primary-800)]">{row.name}</p>
                        <p className="text-[11px] text-[var(--neutral-500)]">{row.description ?? '—'}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'permissions',
            label: 'Yetkiler',
            render: (row) => (
                <span className="text-sm text-[var(--neutral-600)]">
                    {(row.permissions as string[]).length} yetki
                </span>
            ),
        },
        {
            key: '_count',
            label: 'Kullanıcı',
            render: (row) => (
                <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
                    <span className="text-sm text-[var(--neutral-600)]">{row._count.userAssignments}</span>
                </div>
            ),
        },
        {
            key: 'isSystem',
            label: 'Tür',
            render: (row) => (
                <StatusBadge variant={row.isSystem ? 'purple' : 'neutral'} dot={false}>
                    {row.isSystem ? 'Sistem' : 'Özel'}
                </StatusBadge>
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

    const rowActions = (row: PermissionGroup) => (
        <div className="flex items-center gap-1">
            <button
                type="button"
                onClick={() => setEditGroup(row)}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--primary-700)] hover:bg-[var(--neutral-100)]"
            >
                Düzenle
            </button>
            {!row.isSystem && (
                <button
                    type="button"
                    onClick={() => setDeleteTarget(row)}
                    className="rounded-md p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Yetki Grupları</h1>
                    <p className="mt-1 text-sm text-[var(--neutral-600)]">
                        Satıcı personeli (SELLER_STAFF) kullanıcıları için yetki gruplarını yönetin.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => { setEditGroup(null); setShowCreate(true); }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-800)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-700)]"
                >
                    <Plus className="h-4 w-4" />
                    Yeni Grup
                </button>
            </div>

            {isError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4" /> Yetki grupları alınamadı.
                </div>
            )}

            <DataTable<PermissionGroup>
                columns={columns}
                data={groups ?? []}
                keyExtractor={(row) => row.id}
                loading={isLoading}
                onRowClick={(row) => setEditGroup(row)}
                rowActions={(row) => rowActions(row)}
                emptyMessage="Henüz yetki grubu bulunamadı."
            />

            {/* ── Create/Edit Modal ── */}
            {(showCreate || editGroup) && (
                <PermissionGroupModal
                    group={editGroup}
                    onClose={() => { setShowCreate(false); setEditGroup(null); }}
                />
            )}

            {/* ── Delete Modal ── */}
            <ConfirmDeleteModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                title="Yetki Grubunu Sil"
                description={`"${deleteTarget?.name}" yetki grubu silinecek. Bu gruptaki tüm kullanıcı atamaları kaldırılacak.`}
                loading={deleteMutation.isPending}
            />
        </div>
    );
}

/* ── Create / Edit Modal ── */
function PermissionGroupModal({
    group,
    onClose,
}: {
    group: PermissionGroup | null;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();
    const isEdit = !!group;

    const [name, setName] = useState(group?.name ?? '');
    const [description, setDescription] = useState(group?.description ?? '');
    const [selectedPerms, setSelectedPerms] = useState<Set<string>>(
        new Set(group?.permissions ?? []),
    );

    const togglePerm = (perm: string) => {
        setSelectedPerms((prev) => {
            const next = new Set(prev);
            if (next.has(perm)) next.delete(perm);
            else next.add(perm);
            return next;
        });
    };

    const toggleCategory = (perms: string[]) => {
        const allSelected = perms.every((p) => selectedPerms.has(p));
        setSelectedPerms((prev) => {
            const next = new Set(prev);
            perms.forEach((p) => (allSelected ? next.delete(p) : next.add(p)));
            return next;
        });
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = { name, description, permissions: Array.from(selectedPerms) };
            if (isEdit) return api.put(`/permission-groups/${group!.id}`, payload);
            return api.post('/permission-groups', payload);
        },
        onSuccess: async () => {
            toast.success(isEdit ? 'Grup güncellendi.' : 'Grup oluşturuldu.');
            await queryClient.invalidateQueries({ queryKey: ['permission-groups'] });
            onClose();
        },
        onError: (err: unknown) => toast.error(resolveApiErrorMessage(err, 'İşlem başarısız.')),
    });

    const isReadOnly = isEdit && group?.isSystem;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button type="button" aria-label="Kapat" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[var(--primary-800)]">
                        {isEdit ? `Grup Düzenle: ${group!.name}` : 'Yeni Yetki Grubu'}
                    </h3>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-[var(--neutral-500)] hover:bg-[var(--neutral-100)]">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">Grup Adı</label>
                            <input
                                value={name}
                                readOnly={isReadOnly}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)] read-only:bg-[var(--neutral-50)]"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">Açıklama</label>
                            <input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)]"
                            />
                        </div>
                    </div>

                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--neutral-500)]">
                            Yetkiler ({selectedPerms.size} seçili)
                        </p>
                        <div className="space-y-3 max-h-72 overflow-y-auto rounded-lg border border-[var(--neutral-200)] p-3">
                            {Object.entries(permissionCategories).map(([catKey, cat]) => {
                                const allSelected = cat.permissions.every((p) => selectedPerms.has(p));
                                const someSelected = cat.permissions.some((p) => selectedPerms.has(p));
                                return (
                                    <div key={catKey}>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <button
                                                type="button"
                                                disabled={isReadOnly}
                                                onClick={() => toggleCategory(cat.permissions)}
                                                className={`flex h-4 w-4 items-center justify-center rounded border transition ${allSelected
                                                    ? 'border-[var(--primary-600)] bg-[var(--primary-600)]'
                                                    : someSelected
                                                        ? 'border-[var(--primary-400)] bg-[var(--primary-100)]'
                                                        : 'border-[var(--neutral-300)]'
                                                    }`}
                                            >
                                                {allSelected && <Check className="h-3 w-3 text-white" />}
                                            </button>
                                            <span className="text-xs font-semibold text-[var(--primary-800)]">{cat.label}</span>
                                        </div>
                                        <div className="ml-6 flex flex-wrap gap-1.5">
                                            {cat.permissions.map((perm) => (
                                                <button
                                                    key={perm}
                                                    type="button"
                                                    disabled={isReadOnly}
                                                    onClick={() => togglePerm(perm)}
                                                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition border ${selectedPerms.has(perm)
                                                        ? 'border-[var(--primary-200)] bg-[var(--primary-50)] text-[var(--primary-700)]'
                                                        : 'border-[var(--neutral-200)] text-[var(--neutral-600)] hover:bg-[var(--neutral-50)]'
                                                        } ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                                                >
                                                    {perm.split('.').pop()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--neutral-100)]">
                    <button type="button" onClick={onClose} className="rounded-lg border border-[var(--neutral-200)] px-4 py-2 text-sm font-medium text-[var(--neutral-700)] hover:bg-[var(--neutral-100)]">
                        İptal
                    </button>
                    {!isReadOnly && (
                        <button
                            type="button"
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending || !name.trim()}
                            className="rounded-lg bg-[var(--primary-800)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-700)] disabled:opacity-50"
                        >
                            {saveMutation.isPending ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Oluştur'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
