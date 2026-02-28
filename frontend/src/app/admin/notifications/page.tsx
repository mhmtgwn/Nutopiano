'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle, Bell, Check, CheckCheck, Plus, Send, Trash2, X } from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';

type NotificationRow = {
    id: number;
    title: string;
    body: string;
    channel: 'PUSH' | 'EMAIL' | 'SMS' | 'IN_APP';
    targetType: 'ALL' | 'ROLE' | 'USER';
    targetValue: string | null;
    status: 'DRAFT' | 'SENT' | 'SCHEDULED';
    sentAt: string | null;
    scheduledAt: string | null;
    createdAt: string;
};

const channelLabel: Record<string, string> = { PUSH: 'Push', EMAIL: 'E-posta', SMS: 'SMS', IN_APP: 'Uygulama İçi' };
const channelVariant: Record<string, 'info' | 'purple' | 'warning' | 'neutral'> = { PUSH: 'info', EMAIL: 'purple', SMS: 'warning', IN_APP: 'neutral' };
const statusVariant: Record<string, 'success' | 'neutral' | 'warning'> = { SENT: 'success', DRAFT: 'neutral', SCHEDULED: 'warning' };

const resolveApiErr = (e: unknown, f: string) => { const m = (e as any)?.response?.data?.message; return typeof m === 'string' ? m : f; };

export default function NotificationsPage() {
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<NotificationRow | null>(null);

    const { data: notifications, isLoading, isError } = useQuery<NotificationRow[]>({
        queryKey: ['admin-notifications'],
        queryFn: async () => { try { return (await api.get<NotificationRow[]>('/notifications')).data; } catch { return []; } },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => api.delete(`/notifications/${id}`),
        onSuccess: async () => {
            toast.success('Bildirim silindi.');
            setDeleteTarget(null);
            await queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
        },
        onError: (err: unknown) => toast.error(resolveApiErr(err, 'Silme başarısız.')),
    });

    const sendMutation = useMutation({
        mutationFn: async (id: number) => api.post(`/notifications/${id}/send`),
        onSuccess: async () => {
            toast.success('Bildirim gönderildi.');
            await queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
        },
        onError: (err: unknown) => toast.error(resolveApiErr(err, 'Gönderim başarısız.')),
    });

    const columns: DataTableColumn<NotificationRow>[] = [
        {
            key: 'title', label: 'Bildirim', sortable: true,
            render: (row) => (
                <div>
                    <p className="font-semibold text-[var(--primary-800)]">{row.title}</p>
                    <p className="text-[11px] text-[var(--neutral-500)] line-clamp-1">{row.body}</p>
                </div>
            ),
        },
        {
            key: 'channel', label: 'Kanal',
            render: (row) => <StatusBadge variant={channelVariant[row.channel] ?? 'neutral'} dot={false}>{channelLabel[row.channel] ?? row.channel}</StatusBadge>,
        },
        {
            key: 'targetType', label: 'Hedef',
            render: (row) => <span className="text-sm text-[var(--neutral-600)]">{row.targetType === 'ALL' ? 'Herkes' : `${row.targetType}: ${row.targetValue}`}</span>,
        },
        {
            key: 'status', label: 'Durum',
            render: (row) => <StatusBadge variant={statusVariant[row.status] ?? 'neutral'}>{row.status === 'SENT' ? 'Gönderildi' : row.status === 'SCHEDULED' ? 'Planlandı' : 'Taslak'}</StatusBadge>,
        },
        {
            key: 'createdAt', label: 'Oluşturma', sortable: true,
            render: (row) => <span className="text-[var(--neutral-500)]">{new Date(row.createdAt).toLocaleDateString('tr-TR')}</span>,
        },
    ];

    const rowActions = (row: NotificationRow) => (
        <div className="flex items-center gap-1">
            {row.status === 'DRAFT' && (
                <button type="button" onClick={() => sendMutation.mutate(row.id)} disabled={sendMutation.isPending}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50">
                    <Send className="h-3 w-3" /> Gönder
                </button>
            )}
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
                    <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Bildirim Merkezi</h1>
                    <p className="mt-1 text-sm text-[var(--neutral-600)]">Toplu ve hedefli bildirimleri oluşturun, planlayın ve gönderin.</p>
                </div>
                <button type="button" onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-800)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-700)]">
                    <Plus className="h-4 w-4" /> Yeni Bildirim
                </button>
            </div>

            {isError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4" /> Bildirimler alınamadı.
                </div>
            )}

            <DataTable<NotificationRow>
                columns={columns}
                data={notifications ?? []}
                keyExtractor={(row) => row.id}
                loading={isLoading}
                rowActions={(row) => rowActions(row)}
                emptyMessage="Henüz bildirim oluşturulmamış."
            />

            {showCreate && <CreateNotificationModal onClose={() => setShowCreate(false)} />}

            <ConfirmDeleteModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                title="Bildirimi Sil" description={`"${deleteTarget?.title}" bildirimi silinecektir.`}
                loading={deleteMutation.isPending} />
        </div>
    );
}

function CreateNotificationModal({ onClose }: { onClose: () => void }) {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [channel, setChannel] = useState<'PUSH' | 'EMAIL' | 'SMS' | 'IN_APP'>('IN_APP');
    const [targetType, setTargetType] = useState<'ALL' | 'ROLE' | 'USER'>('ALL');
    const [targetValue, setTargetValue] = useState('');

    const createMutation = useMutation({
        mutationFn: async () => api.post('/notifications', { title, body, channel, targetType, targetValue: targetType === 'ALL' ? null : targetValue }),
        onSuccess: async () => {
            toast.success('Bildirim oluşturuldu.');
            await queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
            onClose();
        },
        onError: (err: unknown) => toast.error(resolveApiErr(err, 'Oluşturma başarısız.')),
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button type="button" aria-label="Kapat" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[var(--primary-800)]">Yeni Bildirim</h3>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-[var(--neutral-500)] hover:bg-[var(--neutral-100)]"><X className="h-5 w-5" /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">Başlık</label>
                        <input value={title} onChange={(e) => setTitle(e.target.value)} required
                            className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)]" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">İçerik</label>
                        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
                            className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)] resize-y" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">Kanal</label>
                            <select value={channel} onChange={(e) => setChannel(e.target.value as any)}
                                className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none">
                                <option value="IN_APP">Uygulama İçi</option>
                                <option value="EMAIL">E-posta</option>
                                <option value="SMS">SMS</option>
                                <option value="PUSH">Push</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">Hedef</label>
                            <select value={targetType} onChange={(e) => setTargetType(e.target.value as any)}
                                className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none">
                                <option value="ALL">Herkes</option>
                                <option value="ROLE">Role Göre</option>
                                <option value="USER">Belirli Kullanıcı</option>
                            </select>
                        </div>
                    </div>
                    {targetType !== 'ALL' && (
                        <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">{targetType === 'ROLE' ? 'Rol Adı' : 'Kullanıcı ID'}</label>
                            <input value={targetValue} onChange={(e) => setTargetValue(e.target.value)} required
                                className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)]" />
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-[var(--neutral-200)] px-4 py-2 text-sm font-medium text-[var(--neutral-700)]">İptal</button>
                        <button type="submit" disabled={createMutation.isPending || !title.trim()}
                            className="rounded-lg bg-[var(--primary-800)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-700)] disabled:opacity-50">
                            {createMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
