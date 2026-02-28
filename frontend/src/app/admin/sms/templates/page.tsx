'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { MessageSquare, Save, X } from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';

type SmsTemplate = {
    id: number;
    name: string;
    trigger: string;
    content: string;
    variables: string[];
    isActive: boolean;
    updatedAt: string;
};

const SMS_SEGMENT_SIZE = 160;

const resolveApiErr = (e: unknown, f: string) => {
    const m = (e as any)?.response?.data?.message;
    return typeof m === 'string' ? m : f;
};

export default function SmsTemplatesPage() {
    const queryClient = useQueryClient();
    const [editTpl, setEditTpl] = useState<SmsTemplate | null>(null);

    const { data: templates, isLoading } = useQuery<SmsTemplate[]>({
        queryKey: ['sms-templates'],
        queryFn: async () => { try { return (await api.get<SmsTemplate[]>('/sms-templates')).data; } catch { return []; } },
    });

    const columns: DataTableColumn<SmsTemplate>[] = [
        {
            key: 'name', label: 'Şablon', sortable: true,
            render: (row) => (
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[var(--neutral-400)]" />
                    <div>
                        <p className="font-semibold text-[var(--primary-800)]">{row.name}</p>
                        <p className="text-[10px] text-[var(--neutral-500)]">{row.trigger}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'content', label: 'Karakter',
            render: (row) => {
                const len = row.content?.length ?? 0;
                const segments = Math.ceil(len / SMS_SEGMENT_SIZE);
                return (
                    <div className="text-sm">
                        <span className={`font-medium ${len > SMS_SEGMENT_SIZE ? 'text-amber-600' : 'text-[var(--neutral-600)]'}`}>
                            {len}
                        </span>
                        <span className="text-[var(--neutral-400)]"> / {SMS_SEGMENT_SIZE} ({segments} SMS)</span>
                    </div>
                );
            },
        },
        {
            key: 'isActive', label: 'Durum',
            render: (row) => <StatusBadge variant={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Aktif' : 'Pasif'}</StatusBadge>,
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">SMS Şablonları</h1>
                <p className="mt-1 text-sm text-[var(--neutral-600)]">SMS şablonlarını yönetin. Karakter sayacı SMS segment hesaplar.</p>
            </div>

            <DataTable<SmsTemplate>
                columns={columns}
                data={templates ?? []}
                keyExtractor={(row) => row.id}
                loading={isLoading}
                onRowClick={(row) => setEditTpl(row)}
                emptyMessage="Henüz SMS şablonu bulunamadı."
            />

            {editTpl && <SmsTemplateEditor template={editTpl} onClose={() => setEditTpl(null)} />}
        </div>
    );
}

function SmsTemplateEditor({ template, onClose }: { template: SmsTemplate; onClose: () => void }) {
    const queryClient = useQueryClient();
    const [content, setContent] = useState(template.content);
    const charCount = content.length;
    const segmentCount = Math.ceil(charCount / SMS_SEGMENT_SIZE);

    const saveMutation = useMutation({
        mutationFn: async () => api.put(`/sms-templates/${template.id}`, { content }),
        onSuccess: async () => {
            toast.success('Şablon kaydedildi.');
            await queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
            onClose();
        },
        onError: (err: unknown) => toast.error(resolveApiErr(err, 'Kaydetme başarısız.')),
    });

    const testMutation = useMutation({
        mutationFn: async () => api.post(`/sms-templates/${template.id}/test`),
        onSuccess: () => toast.success('Test SMS gönderildi.'),
        onError: (err: unknown) => toast.error(resolveApiErr(err, 'Test başarısız.')),
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button type="button" aria-label="Kapat" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[var(--primary-800)]">{template.name}</h3>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-[var(--neutral-500)] hover:bg-[var(--neutral-100)]"><X className="h-5 w-5" /></button>
                </div>

                <div className="space-y-4">
                    {template.variables?.length > 0 && (
                        <div>
                            <p className="text-[11px] font-semibold text-[var(--neutral-500)] mb-1">DEĞİŞKENLER</p>
                            <div className="flex flex-wrap gap-1.5">
                                {template.variables.map((v) => (
                                    <span key={v} className="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-mono text-blue-700">{`{{${v}}}`}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6}
                            className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)] resize-y" />
                        <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-medium ${charCount > SMS_SEGMENT_SIZE ? 'text-amber-600' : 'text-[var(--neutral-500)]'}`}>
                                    {charCount}/{SMS_SEGMENT_SIZE}
                                </span>
                                <span className="text-xs text-[var(--neutral-400)]">{segmentCount} SMS</span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-24 h-1.5 rounded-full bg-[var(--neutral-200)] overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${charCount > SMS_SEGMENT_SIZE ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min(100, (charCount / SMS_SEGMENT_SIZE) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--neutral-100)]">
                    <button type="button" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}
                        className="rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-xs font-medium text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] disabled:opacity-50">
                        {testMutation.isPending ? 'Gönderiliyor...' : 'Test Gönder'}
                    </button>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="rounded-lg border border-[var(--neutral-200)] px-4 py-2 text-sm font-medium text-[var(--neutral-700)]">İptal</button>
                        <button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-800)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-700)] disabled:opacity-50">
                            <Save className="h-3.5 w-3.5" /> {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
