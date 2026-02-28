'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Eye, Wallet as WalletIcon, X } from 'lucide-react';

import api from '@/services/api';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';

type WalletRow = {
    id: number;
    sellerId: number;
    sellerName: string;
    currency: string;
    availableBalance: number;
    pendingBalance: number;
    totalBalance: number;
    updatedAt: string;
};

type WalletTx = {
    id: number;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
};

export default function WalletsPage() {
    const [detailWallet, setDetailWallet] = useState<WalletRow | null>(null);

    const { data: wallets, isLoading } = useQuery<WalletRow[]>({
        queryKey: ['admin-wallets'],
        queryFn: async () => { try { return (await api.get<WalletRow[]>('/admin/finance/wallets')).data; } catch { return []; } },
    });

    const { data: txns } = useQuery<WalletTx[]>({
        queryKey: ['wallet-txns', detailWallet?.id],
        queryFn: async () => { try { return (await api.get<WalletTx[]>(`/admin/finance/wallets/${detailWallet!.id}/transactions`)).data; } catch { return []; } },
        enabled: !!detailWallet,
    });

    const columns: DataTableColumn<WalletRow>[] = [
        {
            key: 'sellerName', label: 'Satıcı', sortable: true,
            render: (row) => <span className="font-semibold text-[var(--primary-800)]">{row.sellerName}</span>,
        },
        {
            key: 'availableBalance', label: 'Kullanılabilir', sortable: true,
            render: (row) => <span className="font-semibold text-emerald-600">{row.availableBalance.toLocaleString('tr-TR')} ₺</span>,
        },
        {
            key: 'pendingBalance', label: 'Bekleyen', sortable: true,
            render: (row) => <span className="font-medium text-amber-600">{row.pendingBalance.toLocaleString('tr-TR')} ₺</span>,
        },
        {
            key: 'totalBalance', label: 'Toplam', sortable: true,
            render: (row) => <span className="font-bold text-[var(--primary-800)]">{row.totalBalance.toLocaleString('tr-TR')} ₺</span>,
        },
        {
            key: 'updatedAt', label: 'Son Güncelleme',
            render: (row) => <span className="text-[var(--neutral-500)]">{new Date(row.updatedAt).toLocaleDateString('tr-TR')}</span>,
        },
    ];

    const rowActions = (row: WalletRow) => (
        <button type="button" onClick={() => setDetailWallet(row)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--primary-700)] hover:bg-[var(--neutral-100)]">
            <Eye className="h-3 w-3" /> Detay
        </button>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Cüzdanlar</h1>
                <p className="mt-1 text-sm text-[var(--neutral-600)]">Satıcı cüzdanları ve bakiye bilgileri.</p>
            </div>

            {/* Platform Cüzdanı Özet */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                    { label: 'Toplam Bakiye', value: `${(wallets ?? []).reduce((s, w) => s + w.totalBalance, 0).toLocaleString('tr-TR')} ₺`, color: 'text-[var(--primary-800)]' },
                    { label: 'Kullanılabilir', value: `${(wallets ?? []).reduce((s, w) => s + w.availableBalance, 0).toLocaleString('tr-TR')} ₺`, color: 'text-emerald-600' },
                    { label: 'Bekleyen', value: `${(wallets ?? []).reduce((s, w) => s + w.pendingBalance, 0).toLocaleString('tr-TR')} ₺`, color: 'text-amber-600' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl border border-[var(--neutral-200)] bg-white p-4">
                        <p className="text-[11px] font-medium text-[var(--neutral-500)] mb-1">{label}</p>
                        <p className={`text-xl font-bold ${color}`}>{value}</p>
                    </div>
                ))}
            </div>

            <DataTable<WalletRow>
                columns={columns}
                data={wallets ?? []}
                keyExtractor={(row) => row.id}
                loading={isLoading}
                rowActions={(row) => rowActions(row)}
                emptyMessage="Henüz cüzdan verisi yok."
            />

            {/* Wallet Detail Drawer */}
            {detailWallet && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <button type="button" aria-label="Kapat" onClick={() => setDetailWallet(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative z-10 w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-[var(--primary-800)]">{detailWallet.sellerName} — Cüzdan</h3>
                            <button type="button" onClick={() => setDetailWallet(null)} className="rounded-lg p-1 text-[var(--neutral-500)] hover:bg-[var(--neutral-100)]"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="rounded-lg bg-emerald-50 p-3 text-center">
                                <p className="text-[10px] text-emerald-600 font-medium">Kullanılabilir</p>
                                <p className="text-sm font-bold text-emerald-700">{detailWallet.availableBalance.toLocaleString('tr-TR')} ₺</p>
                            </div>
                            <div className="rounded-lg bg-amber-50 p-3 text-center">
                                <p className="text-[10px] text-amber-600 font-medium">Bekleyen</p>
                                <p className="text-sm font-bold text-amber-700">{detailWallet.pendingBalance.toLocaleString('tr-TR')} ₺</p>
                            </div>
                            <div className="rounded-lg bg-[var(--neutral-50)] p-3 text-center">
                                <p className="text-[10px] text-[var(--neutral-500)] font-medium">Toplam</p>
                                <p className="text-sm font-bold text-[var(--primary-800)]">{detailWallet.totalBalance.toLocaleString('tr-TR')} ₺</p>
                            </div>
                        </div>
                        <h4 className="text-sm font-semibold text-[var(--primary-800)] mb-2">Hareket Geçmişi</h4>
                        <div className="divide-y divide-[var(--neutral-100)]">
                            {(txns ?? []).length > 0 ? (
                                txns!.map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between py-2.5">
                                        <div>
                                            <p className="text-sm text-[var(--primary-800)]">{tx.description || tx.type}</p>
                                            <p className="text-[10px] text-[var(--neutral-500)]">{new Date(tx.createdAt).toLocaleString('tr-TR')}</p>
                                        </div>
                                        <span className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString('tr-TR')} ₺
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="py-6 text-center text-sm text-[var(--neutral-500)]">Hareket geçmişi yok.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
