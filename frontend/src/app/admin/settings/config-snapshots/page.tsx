'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Archive, Clock, Download, Eye, RotateCcw, Save, X } from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';

type ConfigSnapshot = {
    id: number;
    name: string;
    description: string | null;
    configData: Record<string, unknown>;
    version: number;
    isAutoBackup: boolean;
    createdAt: string;
};

const resolveApiErr = (e: unknown, f: string) => { const m = (e as any)?.response?.data?.message; return typeof m === 'string' ? m : f; };

export default function ConfigSnapshotsPage() {
    const queryClient = useQueryClient();
    const [detailSnapshot, setDetailSnapshot] = useState<ConfigSnapshot | null>(null);
    const [restoreTarget, setRestoreTarget] = useState<ConfigSnapshot | null>(null);

    const { data: snapshots, isLoading } = useQuery<ConfigSnapshot[]>({
        queryKey: ['config-snapshots'],
        queryFn: async () => { try { return (await api.get<ConfigSnapshot[]>('/config-snapshots')).data; } catch { return []; } },
    });

    const createMutation = useMutation({
        mutationFn: async () => api.post('/config-snapshots', { name: `Manuel Yedek ${new Date().toLocaleDateString('tr-TR')}` }),
        onSuccess: async () => {
            toast.success('Snapshot oluşturuldu.');
            await queryClient.invalidateQueries({ queryKey: ['config-snapshots'] });
        },
        onError: (err: unknown) => toast.error(resolveApiErr(err, 'Backup başarısız.')),
    });

    const restoreMutation = useMutation({
        mutationFn: async (id: number) => api.post(`/config-snapshots/${id}/restore`),
        onSuccess: async () => {
            toast.success('Konfigürasyon geri yüklendi.');
            setRestoreTarget(null);
            await queryClient.invalidateQueries({ queryKey: ['config-snapshots'] });
        },
        onError: (err: unknown) => toast.error(resolveApiErr(err, 'Geri yükleme başarısız.')),
    });

    const columns: DataTableColumn<ConfigSnapshot>[] = [
        {
            key: 'name', label: 'Snapshot', sortable: true,
            render: (row) => (
                <div>
                    <p className="font-semibold text-[var(--primary-800)]">{row.name}</p>
                    {row.description && <p className="text-[10px] text-[var(--neutral-500)]">{row.description}</p>}
                </div>
            ),
        },
        {
            key: 'version', label: 'Versiyon',
            render: (row) => <span className="font-mono text-sm text-[var(--neutral-600)]">v{row.version}</span>,
        },
        {
            key: 'isAutoBackup', label: 'Tür',
            render: (row) => <StatusBadge variant={row.isAutoBackup ? 'info' : 'neutral'} dot={false}>{row.isAutoBackup ? 'Otomatik' : 'Manuel'}</StatusBadge>,
        },
        {
            key: 'createdAt', label: 'Tarih', sortable: true,
            render: (row) => (
                <div className="flex items-center gap-1 text-[var(--neutral-500)]">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(row.createdAt).toLocaleString('tr-TR')}</span>
                </div>
            ),
        },
    ];

    const rowActions = (row: ConfigSnapshot) => (
        <div className="flex items-center gap-1">
            <button type="button" onClick={() => setDetailSnapshot(row)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--primary-700)] hover:bg-[var(--neutral-100)]">
                <Eye className="h-3 w-3" /> Detay
            </button>
            <button type="button" onClick={() => setRestoreTarget(row)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50">
                <RotateCcw className="h-3 w-3" /> Geri Yükle
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Konfigürasyon Snapshotları</h1>
                    <p className="mt-1 text-sm text-[var(--neutral-600)]">
                        Ayar değişikliklerini sürümleyin. Gerektiğinde önceki bir konfigürasyona geri dönün.
                    </p>
                </div>
                <button type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-800)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-700)] disabled:opacity-50">
                    <Save className="h-4 w-4" /> {createMutation.isPending ? 'Kaydediliyor...' : 'Snapshot Al'}
                </button>
            </div>

            <DataTable<ConfigSnapshot>
                columns={columns}
                data={snapshots ?? []}
                keyExtractor={(row) => row.id}
                loading={isLoading}
                rowActions={(row) => rowActions(row)}
                emptyMessage="Henüz snapshot alınmamış."
            />

            {/* Detail Modal */}
            {detailSnapshot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <button type="button" aria-label="Kapat" onClick={() => setDetailSnapshot(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-[var(--primary-800)]">{detailSnapshot.name} — v{detailSnapshot.version}</h3>
                            <button type="button" onClick={() => setDetailSnapshot(null)} className="rounded-lg p-1 text-[var(--neutral-500)] hover:bg-[var(--neutral-100)]"><X className="h-5 w-5" /></button>
                        </div>
                        <pre className="max-h-96 overflow-auto rounded-lg bg-[var(--neutral-50)] p-4 text-xs text-[var(--neutral-700)] border border-[var(--neutral-200)] font-mono">
                            {JSON.stringify(detailSnapshot.configData, null, 2)}
                        </pre>
                    </div>
                </div>
            )}

            {/* Restore Confirm */}
            <ConfirmDeleteModal open={!!restoreTarget} onClose={() => setRestoreTarget(null)}
                onConfirm={() => restoreTarget && restoreMutation.mutate(restoreTarget.id)}
                title="Konfigürasyon Geri Yükle"
                description={`"${restoreTarget?.name}" snapshot'ı geri yüklenecek. Mevcut ayarlar üzerine yazılacak.`}
                confirmText="Geri Yükle" loading={restoreMutation.isPending} />
        </div>
    );
}
