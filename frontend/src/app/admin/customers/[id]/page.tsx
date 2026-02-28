'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    ArrowLeft, CreditCard, Heart, Mail, MapPin, Package, Phone,
    Plus, ShoppingCart, Trash2, User, Wallet,
} from 'lucide-react';

import api from '@/services/api';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';

type CustomerDetail = {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    balance: number;
    isActive: boolean;
    createdAt: string;
    addresses?: Array<{ id: number; title: string; address: string; city: string; isDefault: boolean }>;
    orders?: Array<{ id: number; orderNumber: string; totalAmount: number; status: string; createdAt: string }>;
    ledgerEntries?: Array<{ id: number; type: string; amount: number; description: string; createdAt: string }>;
};

const resolveApiErr = (e: unknown, f: string) => { const m = (e as any)?.response?.data?.message; return typeof m === 'string' ? m : f; };

export default function AdminCustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const customerId = Number(params.id);

    const [activeTab, setActiveTab] = useState<'orders' | 'ledger' | 'addresses'>('orders');
    const [showCredit, setShowCredit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    const { data: customer, isLoading } = useQuery<CustomerDetail>({
        queryKey: ['admin-customer', customerId],
        queryFn: async () => (await api.get<CustomerDetail>(`/customers/${customerId}`)).data,
        enabled: !isNaN(customerId),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => api.delete(`/customers/${customerId}`),
        onSuccess: () => { toast.success('Müşteri silindi.'); router.push('/admin/customers'); },
        onError: (err: unknown) => toast.error(resolveApiErr(err, 'Silme başarısız.')),
    });

    if (isLoading || !customer) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-8 w-48 rounded bg-[var(--neutral-200)]" />
                <div className="h-64 rounded-xl bg-[var(--neutral-100)]" />
            </div>
        );
    }

    const tabs = [
        { key: 'orders' as const, label: 'Siparişler', icon: ShoppingCart, count: customer.orders?.length },
        { key: 'ledger' as const, label: 'Bakiye Hareketleri', icon: Wallet, count: customer.ledgerEntries?.length },
        { key: 'addresses' as const, label: 'Adresler', icon: MapPin, count: customer.addresses?.length },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => router.push('/admin/customers')}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--neutral-200)] text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]">
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-[var(--primary-800)]">{customer.name}</h1>
                            <StatusBadge variant={customer.isActive ? 'success' : 'neutral'}>
                                {customer.isActive ? 'Aktif' : 'Pasif'}
                            </StatusBadge>
                        </div>
                        <p className="mt-0.5 text-sm text-[var(--neutral-500)]">Müşteri #{customer.id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowCredit(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                        <Plus className="h-3.5 w-3.5" /> Bakiye Ekle
                    </button>
                    <button type="button" onClick={() => setShowDelete(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" /> Sil
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                    { label: 'Bakiye', value: `${customer.balance?.toLocaleString('tr-TR') ?? 0} ₺`, icon: Wallet },
                    { label: 'Siparişler', value: customer.orders?.length ?? 0, icon: ShoppingCart },
                    { label: 'Adresler', value: customer.addresses?.length ?? 0, icon: MapPin },
                    { label: 'Kayıt', value: new Date(customer.createdAt).toLocaleDateString('tr-TR'), icon: User },
                ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-xl border border-[var(--neutral-200)] bg-white p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon className="h-4 w-4 text-[var(--neutral-400)]" />
                            <span className="text-[11px] font-medium text-[var(--neutral-500)]">{label}</span>
                        </div>
                        <p className="text-lg font-semibold text-[var(--primary-800)]">{value}</p>
                    </div>
                ))}
            </div>

            {/* Contact Card */}
            <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-5">
                <h2 className="text-sm font-semibold text-[var(--primary-800)] mb-3">İletişim Bilgileri</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
                        <span className="text-sm text-[var(--primary-800)]">{customer.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
                        <span className="text-sm text-[var(--primary-800)]">{customer.email ?? '—'}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-[var(--neutral-200)]">
                {tabs.map((tab) => (
                    <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition border-b-2 -mb-px ${activeTab === tab.key
                                ? 'border-[var(--primary-600)] text-[var(--primary-700)]'
                                : 'border-transparent text-[var(--neutral-500)] hover:text-[var(--neutral-700)]'
                            }`}>
                        <tab.icon className="h-3.5 w-3.5" />
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="rounded-full bg-[var(--neutral-100)] px-1.5 py-0.5 text-[10px] text-[var(--neutral-600)]">{tab.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="rounded-xl border border-[var(--neutral-200)] bg-white">
                {activeTab === 'orders' && (
                    <div className="divide-y divide-[var(--neutral-100)]">
                        {(customer.orders ?? []).length > 0 ? (
                            customer.orders!.map((order) => (
                                <button key={order.id} type="button" onClick={() => router.push(`/admin/orders/${order.id}`)}
                                    className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-[var(--neutral-50)] transition">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--primary-800)]">{order.orderNumber}</p>
                                        <p className="text-[11px] text-[var(--neutral-500)]">{new Date(order.createdAt).toLocaleDateString('tr-TR')}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-[var(--primary-800)]">{order.totalAmount?.toLocaleString('tr-TR')} ₺</span>
                                        <StatusBadge variant={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' ? 'error' : 'info'} dot={false}>{order.status}</StatusBadge>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <p className="px-5 py-8 text-center text-sm text-[var(--neutral-500)]">Henüz sipariş yok.</p>
                        )}
                    </div>
                )}

                {activeTab === 'ledger' && (
                    <div className="divide-y divide-[var(--neutral-100)]">
                        {(customer.ledgerEntries ?? []).length > 0 ? (
                            customer.ledgerEntries!.map((entry) => (
                                <div key={entry.id} className="flex items-center justify-between px-5 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--primary-800)]">{entry.description}</p>
                                        <p className="text-[11px] text-[var(--neutral-500)]">{new Date(entry.createdAt).toLocaleDateString('tr-TR')}</p>
                                    </div>
                                    <span className={`text-sm font-semibold ${entry.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {entry.amount >= 0 ? '+' : ''}{entry.amount.toLocaleString('tr-TR')} ₺
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="px-5 py-8 text-center text-sm text-[var(--neutral-500)]">Bakiye hareketi yok.</p>
                        )}
                    </div>
                )}

                {activeTab === 'addresses' && (
                    <div className="divide-y divide-[var(--neutral-100)]">
                        {(customer.addresses ?? []).length > 0 ? (
                            customer.addresses!.map((addr) => (
                                <div key={addr.id} className="flex items-start justify-between px-5 py-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-[var(--primary-800)]">{addr.title}</p>
                                            {addr.isDefault && <StatusBadge variant="info" dot={false}>Varsayılan</StatusBadge>}
                                        </div>
                                        <p className="text-[11px] text-[var(--neutral-500)] mt-0.5">{addr.address}, {addr.city}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="px-5 py-8 text-center text-sm text-[var(--neutral-500)]">Kayıtlı adres yok.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Credit Modal */}
            {showCredit && <CreditModal customerId={customerId} onClose={() => setShowCredit(false)} />}

            {/* Delete Modal */}
            <ConfirmDeleteModal open={showDelete} onClose={() => setShowDelete(false)}
                onConfirm={() => deleteMutation.mutate()}
                title="Müşteriyi Sil" description={`"${customer.name}" müşterisi silinecektir.`}
                loading={deleteMutation.isPending} />
        </div>
    );
}

function CreditModal({ customerId, onClose }: { customerId: number; onClose: () => void }) {
    const queryClient = useQueryClient();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    const mutation = useMutation({
        mutationFn: async () => api.post(`/customers/${customerId}/credit`, { amount: Number(amount), description }),
        onSuccess: async () => {
            toast.success('Bakiye güncellendi.');
            await queryClient.invalidateQueries({ queryKey: ['admin-customer', customerId] });
            onClose();
        },
        onError: (err: unknown) => toast.error(resolveApiErr(err, 'İşlem başarısız.')),
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button type="button" aria-label="Kapat" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-[var(--primary-800)] mb-4">Bakiye Ekle/Çıkar</h3>
                <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">Tutar (negatif = çıkarma)</label>
                        <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required
                            className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)]" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">Açıklama</label>
                        <input value={description} onChange={(e) => setDescription(e.target.value)}
                            className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)]" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-[var(--neutral-200)] px-4 py-2 text-sm font-medium text-[var(--neutral-700)]">İptal</button>
                        <button type="submit" disabled={mutation.isPending || !amount}
                            className="rounded-lg bg-[var(--primary-800)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-700)] disabled:opacity-50">
                            {mutation.isPending ? 'İşleniyor...' : 'Uygula'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
