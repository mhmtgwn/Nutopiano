'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle, Copy, Eye, EyeOff, FileKey, Plus, Trash2, X } from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';

type ApiKeyRow = {
    id: number;
    name: string;
    keyPrefix: string;
    scopes: string[];
    isActive: boolean;
    lastUsedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
};

const resolveApiErr = (error: unknown, fallback: string) => {
    const msg = (error as any)?.response?.data?.message;
    return typeof msg === 'string' ? msg : fallback;
};

export default function ApiKeysPage() {
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ApiKeyRow | null>(null);
    const [revealedKey, setRevealedKey] = useState<string | null>(null);

    const { data: keys, isLoading, isError } = useQuery<ApiKeyRow[]>({
        queryKey: ['api-keys'],
        queryFn: async () => { try { return (await api.get<ApiKeyRow[]>('/api-keys')).data; } catch { return []; } },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => api.delete(`/api-keys/${id}`),
        onSuccess: async () => {
            toast.success('API key silindi.');
            setDeleteTarget(null);
            await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
        },
        onError: (err: unknown) => toast.error(resolveApiErr(err, 'Silme başarısız.')),
    });

    const toggleMutation = useMutation({
        mutationFn: async (p: { id: number; isActive: boolean }) => api.put(`/api-keys/${p.id}`, { isActive: p.isActive }),
        onSuccess: async () => {
            toast.success('Durum güncellendi.');
            await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
        },
        onError: (err: unknown) => toast.error(resolveApiErr(err, 'Güncelleme başarısız.')),
    });

    const columns: DataTableColumn<ApiKeyRow>[] = [
        {
            key: 'name',
            label: 'API Key',
            sortable: true,
            render: (row) => (
                <div>
                    <p className="font-semibold text-[var(--primary-800)]">{row.name}</p>
                    <p className="text-[11px] text-[var(--neutral-500)] font-mono">{row.keyPrefix}••••••••</p>
                </div>
            ),
        },
        {
            key: 'scopes',
            label: 'Kapsamlar',
            render: (row) => (
                <div className="flex flex-wrap gap-1">
                    {((row.scopes as string[]) ?? []).slice(0, 3).map((s) => (
                        <span key={s} className="rounded bg-[var(--neutral-100)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--neutral-600)]">{s}</span>
                    ))}
                    {((row.scopes as string[]) ?? []).length > 3 && (
                        <span className="text-[10px] text-[var(--neutral-400)]">+{(row.scopes as string[]).length - 3}</span>
                    )}
                </div>
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
        {
            key: 'lastUsedAt',
            label: 'Son Kullanım',
            render: (row) => (
                <span className="text-[var(--neutral-500)]">
                    {row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleDateString('tr-TR') : '—'}
                </span>
            ),
        },
    ];

    const rowActions = (row: ApiKeyRow) => (
        <div className="flex items-center gap-1">
            <button type="button" onClick={() => toggleMutation.mutate({ id: row.id, isActive: !row.isActive })}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--primary-700)] hover:bg-[var(--neutral-100)]">
                {row.isActive ? 'Deaktif Et' : 'Aktif Et'}
            </button>
            <button type="button" onClick={() => setDeleteTarget(row)}
                className="rounded-md p-1 text-red-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">API Key Yönetimi</h1>
                    <p className="mt-1 text-sm text-[var(--neutral-600)]">Harici entegrasyon anahtarlarını yönetin.</p>
                </div>
                <button type="button" onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-800)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-700)]">
                    <Plus className="h-4 w-4" /> Yeni API Key
                </button>
            </div>

            {isError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4" /> Veri alınamadı.
                </div>
            )}

            {/* Revealed key banner */}
            {revealedKey && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-xs font-semibold text-emerald-700 mb-1">API Key (sadece bir kez gösterilir):</p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-white px-3 py-1.5 text-sm font-mono text-emerald-800 border border-emerald-200">{revealedKey}</code>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(revealedKey); toast.success('Kopyalandı!'); }}
                            className="rounded-lg border border-emerald-200 p-2 text-emerald-600 hover:bg-emerald-100">
                            <Copy className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setRevealedKey(null)}
                            className="rounded-lg border border-emerald-200 p-2 text-emerald-600 hover:bg-emerald-100">
                            <EyeOff className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            <DataTable<ApiKeyRow>
                columns={columns}
                data={keys ?? []}
                keyExtractor={(row) => row.id}
                loading={isLoading}
                rowActions={(row) => rowActions(row)}
                emptyMessage="Henüz API key oluşturulmamış."
            />

            {showCreate && (
                <CreateApiKeyModal
                    onClose={() => setShowCreate(false)}
                    onCreated={(key) => setRevealedKey(key)}
                />
            )}

            <ConfirmDeleteModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                title="API Key Sil"
                description={`"${deleteTarget?.name}" anahtarı kalıcı olarak silinecek.`}
                loading={deleteMutation.isPending}
            />
        </div>
    );
}

function CreateApiKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (key: string) => void }) {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [scopes, setScopes] = useState('');

    const createMutation = useMutation({
        mutationFn: async () => api.post<{ rawKey: string }>('/api-keys', { name, scopes: scopes.split(',').map(s => s.trim()).filter(Boolean) }),
        onSuccess: async (res) => {
            toast.success('API key oluşturuldu.');
            onCreated(res.data.rawKey);
            await queryClient.invalidateQueries({ queryKey: ['api-keys'] });
            onClose();
        },
        onError: (err: unknown) => toast.error(resolveApiErr(err, 'Oluşturma başarısız.')),
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button type="button" aria-label="Kapat" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[var(--primary-800)]">Yeni API Key</h3>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-[var(--neutral-500)] hover:bg-[var(--neutral-100)]"><X className="h-5 w-5" /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">Ad</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Production API Key"
                            className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)]" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">Kapsamlar (virgülle ayırın)</label>
                        <input value={scopes} onChange={(e) => setScopes(e.target.value)} placeholder="orders.read, products.write"
                            className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)]" />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-[var(--neutral-200)] px-4 py-2 text-sm font-medium text-[var(--neutral-700)]">İptal</button>
                        <button type="submit" disabled={createMutation.isPending || !name.trim()}
                            className="rounded-lg bg-[var(--primary-800)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-700)] disabled:opacity-50">
                            {createMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
