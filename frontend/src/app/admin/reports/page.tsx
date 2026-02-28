'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download, ShoppingCart, TrendingUp, Users, Wallet } from 'lucide-react';

import api from '@/services/api';

type SalesSummary = {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    newCustomers: number;
};

type SellerReport = {
    id: number;
    name: string;
    totalSales: number;
    orderCount: number;
    commission: number;
};

type TopProduct = {
    id: number;
    name: string;
    totalSold: number;
    revenue: number;
    category: string;
};

type TabKey = 'sales' | 'finance' | 'products' | 'customers';

const tabs: Array<{ key: TabKey; label: string; icon: typeof BarChart3 }> = [
    { key: 'sales', label: 'Satış Raporları', icon: TrendingUp },
    { key: 'finance', label: 'Finans Raporları', icon: Wallet },
    { key: 'products', label: 'Ürün/Kategori', icon: ShoppingCart },
    { key: 'customers', label: 'Müşteri', icon: Users },
];

export default function AdminReportsPage() {
    const [activeTab, setActiveTab] = useState<TabKey>('sales');
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

    const { data: salesSummary } = useQuery<SalesSummary>({
        queryKey: ['reports-sales', period],
        queryFn: async () => {
            try { return (await api.get<SalesSummary>(`/admin/reports/sales?period=${period}`)).data; }
            catch { return { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, newCustomers: 0 }; }
        },
    });

    const { data: sellerReports } = useQuery<SellerReport[]>({
        queryKey: ['reports-sellers'],
        queryFn: async () => { try { return (await api.get<SellerReport[]>('/admin/reports/sellers')).data; } catch { return []; } },
    });

    const { data: topProducts } = useQuery<TopProduct[]>({
        queryKey: ['reports-products'],
        queryFn: async () => { try { return (await api.get<TopProduct[]>('/admin/reports/products')).data; } catch { return []; } },
    });

    const handleExport = async (type: 'csv' | 'pdf') => {
        try {
            const res = await api.get(`/admin/reports/export?type=${type}&tab=${activeTab}`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data as Blob);
            const a = document.createElement('a');
            a.href = url; a.download = `rapor-${activeTab}-${new Date().toISOString().slice(0, 10)}.${type}`;
            a.click(); URL.revokeObjectURL(url);
        } catch { /* */ }
    };

    const summary = salesSummary ?? { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, newCustomers: 0 };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Raporlar</h1>
                    <p className="mt-1 text-sm text-[var(--neutral-600)]">Satış, finans, ürün ve müşteri analizleri.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleExport('csv')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-xs font-medium text-[var(--neutral-700)] hover:bg-[var(--neutral-100)]">
                        <Download className="h-3.5 w-3.5" /> CSV
                    </button>
                    <button type="button" onClick={() => handleExport('pdf')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-xs font-medium text-[var(--neutral-700)] hover:bg-[var(--neutral-100)]">
                        <Download className="h-3.5 w-3.5" /> PDF
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-[var(--neutral-200)]">
                {tabs.map((tab) => (
                    <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition border-b-2 -mb-px ${activeTab === tab.key ? 'border-[var(--primary-600)] text-[var(--primary-700)]' : 'border-transparent text-[var(--neutral-500)]'
                            }`}>
                        <tab.icon className="h-3.5 w-3.5" /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Sales Tab */}
            {activeTab === 'sales' && (
                <div className="space-y-6">
                    {/* Period Selector */}
                    <div className="flex gap-1 rounded-lg bg-[var(--neutral-100)] p-1 w-fit">
                        {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                            <button key={p} type="button" onClick={() => setPeriod(p)}
                                className={`rounded-md px-4 py-1.5 text-xs font-medium transition ${period === p ? 'bg-white text-[var(--primary-800)] shadow-sm' : 'text-[var(--neutral-500)]'}`}>
                                {p === 'daily' ? 'Günlük' : p === 'weekly' ? 'Haftalık' : 'Aylık'}
                            </button>
                        ))}
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                        {[
                            { label: 'Toplam Gelir', value: `${summary.totalRevenue.toLocaleString('tr-TR')} ₺`, icon: TrendingUp, color: 'text-emerald-600' },
                            { label: 'Toplam Sipariş', value: summary.totalOrders, icon: ShoppingCart, color: 'text-blue-600' },
                            { label: 'Ort. Sipariş Tutarı', value: `${summary.avgOrderValue.toLocaleString('tr-TR')} ₺`, icon: Wallet, color: 'text-purple-600' },
                            { label: 'Yeni Müşteri', value: summary.newCustomers, icon: Users, color: 'text-amber-600' },
                        ].map(({ label, value, icon: Icon, color }) => (
                            <div key={label} className="rounded-xl border border-[var(--neutral-200)] bg-white p-5">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon className={`h-4 w-4 ${color}`} />
                                    <span className="text-[11px] font-medium text-[var(--neutral-500)]">{label}</span>
                                </div>
                                <p className={`text-xl font-bold ${color}`}>{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Seller Comparison */}
                    <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-6">
                        <h3 className="text-base font-semibold text-[var(--primary-800)] mb-4">Satıcı Bazlı Karşılaştırma</h3>
                        <div className="space-y-3">
                            {(sellerReports ?? []).map((seller) => {
                                const maxSales = Math.max(...(sellerReports ?? []).map(s => s.totalSales), 1);
                                return (
                                    <div key={seller.id} className="flex items-center gap-4">
                                        <span className="w-32 text-sm font-medium text-[var(--primary-800)] truncate">{seller.name}</span>
                                        <div className="flex-1 h-6 rounded-full bg-[var(--neutral-100)] overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                                                style={{ width: `${(seller.totalSales / maxSales) * 100}%` }} />
                                        </div>
                                        <span className="w-28 text-right text-sm font-semibold text-[var(--primary-800)]">{seller.totalSales.toLocaleString('tr-TR')} ₺</span>
                                        <span className="w-16 text-right text-[11px] text-[var(--neutral-500)]">{seller.orderCount} sipariş</span>
                                    </div>
                                );
                            })}
                            {(sellerReports ?? []).length === 0 && (
                                <p className="text-sm text-[var(--neutral-500)] text-center py-8">Satıcı rapor verisi yok.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Finance Tab */}
            {activeTab === 'finance' && (
                <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-6">
                    <h3 className="text-base font-semibold text-[var(--primary-800)] mb-4">Finans Raporları</h3>
                    <p className="text-sm text-[var(--neutral-600)]">
                        Komisyon, payout ve gelir/gider raporları. Detaylı finans verilerini <a href="/admin/finance" className="text-[var(--primary-700)] underline">Finans Kontrol</a> sayfasından inceleyin.
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {[
                            { label: 'Ledger Kayıtları', href: '/admin/finance/ledger', desc: 'Çift kayıt detayları' },
                            { label: 'Cüzdanlar', href: '/admin/finance/wallets', desc: 'Satıcı bakiyeleri' },
                            { label: 'Payout Talepleri', href: '/admin/finance/payouts', desc: 'Ödeme talepleri' },
                        ].map(({ label, href, desc }) => (
                            <a key={href} href={href} className="rounded-lg border border-[var(--neutral-200)] p-4 hover:border-[var(--primary-300)] hover:bg-[var(--neutral-50)] transition">
                                <p className="text-sm font-semibold text-[var(--primary-800)]">{label}</p>
                                <p className="text-[11px] text-[var(--neutral-500)]">{desc}</p>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
                <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-6">
                    <h3 className="text-base font-semibold text-[var(--primary-800)] mb-4">En Çok Satan Ürünler</h3>
                    <div className="space-y-2">
                        {(topProducts ?? []).map((product, i) => (
                            <div key={product.id} className="flex items-center gap-3 rounded-lg border border-[var(--neutral-100)] px-4 py-3 hover:bg-[var(--neutral-50)] transition">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary-50)] text-xs font-bold text-[var(--primary-700)]">{i + 1}</span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-[var(--primary-800)]">{product.name}</p>
                                    <p className="text-[10px] text-[var(--neutral-500)]">{product.category}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-[var(--primary-800)]">{product.revenue.toLocaleString('tr-TR')} ₺</p>
                                    <p className="text-[10px] text-[var(--neutral-500)]">{product.totalSold} adet</p>
                                </div>
                            </div>
                        ))}
                        {(topProducts ?? []).length === 0 && (
                            <p className="text-sm text-[var(--neutral-500)] text-center py-8">Ürün satış verisi yok.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
                <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-6">
                    <h3 className="text-base font-semibold text-[var(--primary-800)] mb-4">Müşteri Analizleri</h3>
                    <p className="text-sm text-[var(--neutral-600)] mb-4">Yeni müşteri kazanımı ve segmentasyon verileri.</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <a href="/admin/customers" className="rounded-lg border border-[var(--neutral-200)] p-4 hover:border-[var(--primary-300)] hover:bg-[var(--neutral-50)] transition">
                            <p className="text-sm font-semibold text-[var(--primary-800)]">Tüm Müşteriler</p>
                            <p className="text-[11px] text-[var(--neutral-500)]">Müşteri listesi ve yönetimi</p>
                        </a>
                        <div className="rounded-lg border border-[var(--neutral-200)] p-4">
                            <p className="text-sm font-semibold text-[var(--primary-800)]">Segmentasyon</p>
                            <p className="text-[11px] text-[var(--neutral-500)]">Yakında — müşteri segmentleri ve analiz</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
