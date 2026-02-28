'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle, Flag, Plus, X } from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';

type FeatureFlag = {
    id: number;
    key: string;
    name: string;
    description: string | null;
    scope: 'GLOBAL' | 'BUSINESS' | 'SELLER';
    isActive: boolean;
    createdAt: string;
};

const scopeLabel: Record<string, string> = {
    GLOBAL: 'Global', BUSINESS: 'İşletme', SELLER: 'Satıcı',
};

const scopeVariant: Record<string, 'info' | 'purple' | 'warning'> = {
    GLOBAL: 'info', BUSINESS: 'purple', SELLER: 'warning',
};

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
    const msg = (error as any)?.response?.data?.message;
    if (Array.isArray(msg)) return msg.map(String).join(', ');
    if (typeof msg === 'string') return msg;
    return fallback;
};

export default function FeatureFlagsPage() {
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);

    const { data: flags, isLoading, isError } = useQuery<FeatureFlag[]>({
        queryKey: ['feature-flags'],
        queryFn: async () => {
            try {
                return (await api.get<FeatureFlag[]>('/feature-flags')).data;
            } catch { return []; }
        },
    });

    const toggleMutation = useMutation({
        mutationFn: async (p: { id: number; isActive: boolean }) =>
            api.put(`/feature-flags/${p.id}`, { isActive: p.isActive }),
        onSuccess: async () => {
            toast.success('Flag güncellendi.');
            await queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
        },
        onError: (err: unknown) => toast.error(resolveApiErrorMessage(err, 'Güncelleme başarısız.')),
    });

    const columns: DataTableColumn<FeatureFlag>[] = [
        {
            key: 'key',
            label: 'Flag',
            sortable: true,
            render: (row) => (
                <div>
                    <div className="flex items-center gap-2">
                        <Flag className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
                        <span className="font-semibold text-[var(--primary-800)]">{row.key}</span>
                    </div>
                    {row.description && (
                        <p className="mt-0.5 text-[11px] text-[var(--neutral-500)] ml-5.5">{row.description}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'scope',
            label: 'Kapsam',
            render: (row) => (
                <StatusBadge variant={scopeVariant[row.scope] ?? 'neutral'} dot={false}>
                    {scopeLabel[row.scope] ?? row.scope}
                </StatusBadge>
            ),
        },
        {
            key: 'isActive',
            label: 'Durum',
            render: (row) => (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ id: row.id, isActive: !row.isActive }); }}
                    disabled={toggleMutation.isPending}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${row.isActive ? 'bg-emerald-500' : 'bg-[var(--neutral-300)]'
                        }`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${row.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                </button>
            ),
        },
        {
            key: 'createdAt',
            label: 'Oluşturma',
            sortable: true,
            render: (row) => (
                <span className="text-[var(--neutral-500)]">{new Date(row.createdAt).toLocaleDateString('tr-TR')}</span>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Feature Flags</h1>
                    <p className="mt-1 text-sm text-[var(--neutral-600)]">
                        Platform özelliklerini açıp kapayın. Kapsam bazlı kontrol (Global, İşletme, Satıcı).
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-800)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-700)]"
                >
                    <Plus className="h-4 w-4" />
                    Yeni Flag
                </button>
            </div>

            {isError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4" /> Veriler alınamadı.
                </div>
            )}

            <DataTable<FeatureFlag>
                columns={columns}
                data={flags ?? []}
                keyExtractor={(row) => row.id}
                loading={isLoading}
                emptyMessage="Henüz feature flag tanımlanmamış."
            />

            {showCreate && <CreateFlagModal onClose={() => setShowCreate(false)} />}
        </div>
    );
}

function CreateFlagModal({ onClose }: { onClose: () => void }) {
    const queryClient = useQueryClient();
    const [key, setKey] = useState('');
    const [description, setDescription] = useState('');
    const [scope, setScope] = useState<'GLOBAL' | 'BUSINESS' | 'SELLER'>('GLOBAL');

    const createMutation = useMutation({
        mutationFn: async () => api.post('/feature-flags', { key, description, scope, isActive: false }),
        onSuccess: async () => {
            toast.success('Flag oluşturuldu.');
            await queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
            onClose();
        },
        onError: (err: unknown) => toast.error(resolveApiErrorMessage(err, 'Oluşturma başarısız.')),
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button type="button" aria-label="Kapat" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[var(--primary-800)]">Yeni Feature Flag</h3>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-[var(--neutral-500)] hover:bg-[var(--neutral-100)]"><X className="h-5 w-5" /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">Key</label>
                        <input value={key} onChange={(e) => setKey(e.target.value)} required placeholder="feature.xxx"
                            className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)]" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">Açıklama</label>
                        <input value={description} onChange={(e) => setDescription(e.target.value)}
                            className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)]" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">Kapsam</label>
                        <select value={scope} onChange={(e) => setScope(e.target.value as any)}
                            className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)]">
                            <option value="GLOBAL">Global</option>
                            <option value="BUSINESS">İşletme</option>
                            <option value="SELLER">Satıcı</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-[var(--neutral-200)] px-4 py-2 text-sm font-medium text-[var(--neutral-700)] hover:bg-[var(--neutral-100)]">İptal</button>
                        <button type="submit" disabled={createMutation.isPending || !key.trim()}
                            className="rounded-lg bg-[var(--primary-800)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-700)] disabled:opacity-50">
                            {createMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
