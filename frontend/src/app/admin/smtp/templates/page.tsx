'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle, Eye, Mail, Plus, Save, X } from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';

type EmailTemplate = {
    id: number;
    name: string;
    trigger: string;
    subject: string;
    htmlBody: string;
    variables: string[];
    isActive: boolean;
    updatedAt: string;
};

const resolveApiErr = (e: unknown, f: string) => {
    const m = (e as any)?.response?.data?.message;
    return typeof m === 'string' ? m : f;
};

export default function EmailTemplatesPage() {
    const queryClient = useQueryClient();
    const [editTpl, setEditTpl] = useState<EmailTemplate | null>(null);

    const { data: templates, isLoading } = useQuery<EmailTemplate[]>({
        queryKey: ['email-templates'],
        queryFn: async () => { try { return (await api.get<EmailTemplate[]>('/email-templates')).data; } catch { return []; } },
    });

    const columns: DataTableColumn<EmailTemplate>[] = [
        {
            key: 'name', label: 'Şablon', sortable: true,
            render: (row) => (
                <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[var(--neutral-400)]" />
                    <div>
                        <p className="font-semibold text-[var(--primary-800)]">{row.name}</p>
                        <p className="text-[10px] text-[var(--neutral-500)]">{row.trigger}</p>
                    </div>
                </div>
            ),
        },
        { key: 'subject', label: 'Konu', render: (row) => <span className="text-sm text-[var(--neutral-600)]">{row.subject}</span> },
        {
            key: 'isActive', label: 'Durum',
            render: (row) => <StatusBadge variant={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Aktif' : 'Pasif'}</StatusBadge>,
        },
        {
            key: 'updatedAt', label: 'Son Düzenleme', sortable: true,
            render: (row) => <span className="text-[var(--neutral-500)]">{new Date(row.updatedAt).toLocaleDateString('tr-TR')}</span>,
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">E-posta Şablonları</h1>
                <p className="mt-1 text-sm text-[var(--neutral-600)]">Sistem e-postalarının şablonlarını yönetin.</p>
            </div>

            <DataTable<EmailTemplate>
                columns={columns}
                data={templates ?? []}
                keyExtractor={(row) => row.id}
                loading={isLoading}
                onRowClick={(row) => setEditTpl(row)}
                emptyMessage="Henüz e-posta şablonu bulunamadı."
            />

            {editTpl && <EmailTemplateEditor template={editTpl} onClose={() => setEditTpl(null)} />}
        </div>
    );
}

function EmailTemplateEditor({ template, onClose }: { template: EmailTemplate; onClose: () => void }) {
    const queryClient = useQueryClient();
    const [subject, setSubject] = useState(template.subject);
    const [htmlBody, setHtmlBody] = useState(template.htmlBody);
    const [showPreview, setShowPreview] = useState(false);

    const saveMutation = useMutation({
        mutationFn: async () => api.put(`/email-templates/${template.id}`, { subject, htmlBody }),
        onSuccess: async () => {
            toast.success('Şablon kaydedildi.');
            await queryClient.invalidateQueries({ queryKey: ['email-templates'] });
            onClose();
        },
        onError: (err: unknown) => toast.error(resolveApiErr(err, 'Kaydetme başarısız.')),
    });

    const testMutation = useMutation({
        mutationFn: async () => api.post(`/email-templates/${template.id}/test`),
        onSuccess: () => toast.success('Test e-postası gönderildi.'),
        onError: (err: unknown) => toast.error(resolveApiErr(err, 'Test başarısız.')),
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button type="button" aria-label="Kapat" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[var(--primary-800)]">{template.name}</h3>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-[var(--neutral-500)] hover:bg-[var(--neutral-100)]"><X className="h-5 w-5" /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">Konu Satırı</label>
                        <input value={subject} onChange={(e) => setSubject(e.target.value)}
                            className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)]" />
                    </div>

                    {/* Değişkenler */}
                    {template.variables?.length > 0 && (
                        <div>
                            <p className="text-[11px] font-semibold text-[var(--neutral-500)] mb-1">KULLANILABILIR DEĞİŞKENLER</p>
                            <div className="flex flex-wrap gap-1.5">
                                {template.variables.map((v) => (
                                    <span key={v} className="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-mono text-blue-700">{`{{${v}}}`}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tabs — Editor / Preview */}
                    <div className="flex gap-2 border-b border-[var(--neutral-200)]">
                        <button type="button" onClick={() => setShowPreview(false)}
                            className={`px-3 py-2 text-xs font-medium transition border-b-2 -mb-px ${!showPreview ? 'border-[var(--primary-600)] text-[var(--primary-700)]' : 'border-transparent text-[var(--neutral-500)]'}`}>
                            Düzenle
                        </button>
                        <button type="button" onClick={() => setShowPreview(true)}
                            className={`px-3 py-2 text-xs font-medium transition border-b-2 -mb-px flex items-center gap-1 ${showPreview ? 'border-[var(--primary-600)] text-[var(--primary-700)]' : 'border-transparent text-[var(--neutral-500)]'}`}>
                            <Eye className="h-3 w-3" /> Önizleme
                        </button>
                    </div>

                    {showPreview ? (
                        <div className="rounded-lg border border-[var(--neutral-200)] p-4 bg-white min-h-[200px]"
                            dangerouslySetInnerHTML={{ __html: htmlBody }} />
                    ) : (
                        <textarea value={htmlBody} onChange={(e) => setHtmlBody(e.target.value)} rows={12}
                            className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm font-mono outline-none focus:border-[var(--primary-400)] resize-y" />
                    )}
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
