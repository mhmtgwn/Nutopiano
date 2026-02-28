'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Shield, X } from 'lucide-react';
import { useState } from 'react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';

type MismatchRow = {
    id: number;
    orderId: number;
    orderNumber: string;
    mismatchType: string;
    expectedAmount: number;
    actualAmount: number;
    difference: number;
    status: 'OPEN' | 'RESOLVED' | 'IGNORED';
    configVersionAtOrder: number | null;
    currentConfigVersion: number | null;
    createdAt: string;
    details?: Record<string, unknown>;
};

const statusVariant: Record<string, 'error' | 'success' | 'neutral'> = { OPEN: 'error', RESOLVED: 'success', IGNORED: 'neutral' };
const statusLabel: Record<string, string> = { OPEN: 'Açık', RESOLVED: 'Çözüldü', IGNORED: 'Yoksayıldı' };

export default function MismatchMonitorPage() {
    const [detailRow, setDetailRow] = useState<MismatchRow | null>(null);

    const { data: rows, isLoading } = useQuery<MismatchRow[]>({
        queryKey: ['mismatch-monitor'],
        queryFn: async () => { try { return (await api.get<MismatchRow[]>('/admin/finance/mismatch')).data; } catch { return []; } },
    });

    const columns: DataTableColumn<MismatchRow>[] = [
        {
            key: 'orderNumber', label: 'Sipariş', sortable: true,
            render: (row) => <span className="font-semibold text-[var(--primary-800)]">#{row.orderNumber}</span>,
        },
        {
            key: 'mismatchType', label: 'Uyumsuzluk Tipi',
            render: (row) => <StatusBadge variant="warning" dot={false}>{row.mismatchType}</StatusBadge>,
        },
        {
            key: 'expectedAmount', label: 'Beklenen',
            render: (row) => <span className="text-sm font-medium text-[var(--neutral-700)]">{row.expectedAmount.toLocaleString('tr-TR')} ₺</span>,
        },
        {
            key: 'actualAmount', label: 'Gerçekleşen',
            render: (row) => <span className="text-sm font-medium text-[var(--neutral-700)]">{row.actualAmount.toLocaleString('tr-TR')} ₺</span>,
        },
        {
            key: 'difference', label: 'Fark', sortable: true,
            render: (row) => <span className="font-semibold text-red-600">{row.difference.toLocaleString('tr-TR')} ₺</span>,
        },
        {
            key: 'status', label: 'Durum',
            render: (row) => <StatusBadge variant={statusVariant[row.status] ?? 'neutral'}>{statusLabel[row.status] ?? row.status}</StatusBadge>,
        },
        {
            key: 'configVersionAtOrder', label: 'Config',
            render: (row) => {
                if (!row.configVersionAtOrder) return <span className="text-[var(--neutral-400)]">—</span>;
                const changed = row.configVersionAtOrder !== row.currentConfigVersion;
                return (
                    <div className="flex items-center gap-1">
                        <span className={`text-xs font-mono ${changed ? 'text-amber-600' : 'text-[var(--neutral-500)]'}`}>
                            v{row.configVersionAtOrder}
                        </span>
                        {changed && (
                            <>
                                <ArrowRight className="h-3 w-3 text-amber-500" />
                                <span className="text-xs font-mono text-emerald-600">v{row.currentConfigVersion}</span>
                            </>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Uyumsuzluk İzleme</h1>
                <p className="mt-1 text-sm text-[var(--neutral-600)]">Beklenen vs gerçekleşen fiyat/komisyon farkları. Config snapshot karşılaştırma.</p>
            </div>

            {(rows ?? []).filter(r => r.status === 'OPEN').length > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span><strong>{(rows ?? []).filter(r => r.status === 'OPEN').length}</strong> açık uyumsuzluk var.</span>
                </div>
            )}

            <DataTable<MismatchRow>
                columns={columns}
                data={rows ?? []}
                keyExtractor={(row) => row.id}
                loading={isLoading}
                onRowClick={(row) => setDetailRow(row)}
                emptyMessage="Uyumsuzluk kaydı bulunamadı."
            />

            {detailRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <button type="button" aria-label="Kapat" onClick={() => setDetailRow(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-[var(--primary-800)]">Uyumsuzluk #{detailRow.id}</h3>
                            <button type="button" onClick={() => setDetailRow(null)} className="rounded-lg p-1 text-[var(--neutral-500)] hover:bg-[var(--neutral-100)]"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div><span className="text-[var(--neutral-500)]">Sipariş:</span> <span className="font-medium">#{detailRow.orderNumber}</span></div>
                            <div><span className="text-[var(--neutral-500)]">Tip:</span> <span className="font-medium">{detailRow.mismatchType}</span></div>
                            <div><span className="text-[var(--neutral-500)]">Beklenen:</span> <span className="font-medium">{detailRow.expectedAmount.toLocaleString('tr-TR')} ₺</span></div>
                            <div><span className="text-[var(--neutral-500)]">Gerçekleşen:</span> <span className="font-medium">{detailRow.actualAmount.toLocaleString('tr-TR')} ₺</span></div>
                            <div><span className="text-[var(--neutral-500)]">Fark:</span> <span className="font-semibold text-red-600">{detailRow.difference.toLocaleString('tr-TR')} ₺</span></div>
                            <div><span className="text-[var(--neutral-500)]">Config:</span> <span className="font-mono">v{detailRow.configVersionAtOrder} → v{detailRow.currentConfigVersion}</span></div>
                        </div>
                        {detailRow.details && (
                            <pre className="max-h-48 overflow-auto rounded-lg bg-[var(--neutral-50)] p-3 text-xs text-[var(--neutral-700)] border border-[var(--neutral-200)]">
                                {JSON.stringify(detailRow.details, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
