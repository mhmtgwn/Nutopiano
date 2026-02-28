'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft, Box, Calendar, Clock, CreditCard, MapPin, Phone,
    ShoppingBag, Truck, User,
} from 'lucide-react';

import api from '@/services/api';
import StatusBadge from '@/components/common/StatusBadge';

type OrderDetail = {
    id: number;
    orderNumber: string;
    status: string;
    totalAmount: number;
    currency: string;
    source: string;
    createdAt: string;
    updatedAt: string;
    customer?: { id: number; name: string; phone: string; email?: string };
    seller?: { id: number; displayName: string };
    items?: Array<{
        id: number;
        productName: string;
        variantLabel?: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
    }>;
    shippingAddress?: { fullName: string; address: string; city: string; phone: string };
    statusHistory?: Array<{ status: string; createdAt: string; note?: string }>;
};

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    PENDING: 'warning', CONFIRMED: 'info', PREPARING: 'info',
    SHIPPED: 'purple' as any, DELIVERED: 'success', CANCELLED: 'error', RETURNED: 'error',
};

export default function AdminOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = Number(params.id);

    const { data: order, isLoading } = useQuery<OrderDetail>({
        queryKey: ['admin-order', orderId],
        queryFn: async () => (await api.get<OrderDetail>(`/orders/${orderId}`)).data,
        enabled: !isNaN(orderId),
    });

    if (isLoading || !order) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-8 w-48 rounded bg-[var(--neutral-200)]" />
                <div className="h-64 rounded-xl bg-[var(--neutral-100)]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => router.push('/admin/orders')}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--neutral-200)] text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]">
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-[var(--primary-800)]">Sipariş #{order.orderNumber}</h1>
                            <StatusBadge variant={statusVariant[order.status] ?? 'neutral'}>{order.status}</StatusBadge>
                            <span className="rounded bg-[var(--neutral-100)] px-2 py-0.5 text-[10px] font-medium text-[var(--neutral-600)]">{order.source ?? 'WEB'}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-[var(--neutral-500)]">
                            {new Date(order.createdAt).toLocaleString('tr-TR')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left — Main */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Items */}
                    <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-6">
                        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--primary-800)] mb-4">
                            <Box className="h-4 w-4 text-[var(--neutral-400)]" /> Ürün Kalemleri
                        </h2>
                        <div className="space-y-3">
                            {(order.items ?? []).map((item) => (
                                <div key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--neutral-100)] px-4 py-3">
                                    <div>
                                        <p className="font-medium text-[var(--primary-800)]">{item.productName}</p>
                                        {item.variantLabel && <p className="text-[11px] text-[var(--neutral-500)]">{item.variantLabel}</p>}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-[var(--primary-800)]">{item.totalPrice.toLocaleString('tr-TR')} ₺</p>
                                        <p className="text-[11px] text-[var(--neutral-500)]">{item.quantity} × {item.unitPrice.toLocaleString('tr-TR')} ₺</p>
                                    </div>
                                </div>
                            ))}
                            {(order.items ?? []).length === 0 && (
                                <p className="text-sm text-[var(--neutral-500)]">Kalem bilgisi yüklenemedi.</p>
                            )}
                        </div>
                        <div className="flex justify-end mt-4 pt-3 border-t border-[var(--neutral-100)]">
                            <div className="text-right">
                                <p className="text-xs text-[var(--neutral-500)]">TOPLAM</p>
                                <p className="text-lg font-bold text-[var(--primary-800)]">{order.totalAmount?.toLocaleString('tr-TR')} ₺</p>
                            </div>
                        </div>
                    </div>

                    {/* Status Timeline */}
                    <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-6">
                        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--primary-800)] mb-4">
                            <Clock className="h-4 w-4 text-[var(--neutral-400)]" /> Durum Geçmişi
                        </h2>
                        {(order.statusHistory ?? []).length > 0 ? (
                            <div className="space-y-3">
                                {order.statusHistory!.map((entry, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--primary-600)] flex-shrink-0" />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <StatusBadge variant={statusVariant[entry.status] ?? 'neutral'} dot={false}>{entry.status}</StatusBadge>
                                                <span className="text-[11px] text-[var(--neutral-500)]">{new Date(entry.createdAt).toLocaleString('tr-TR')}</span>
                                            </div>
                                            {entry.note && <p className="text-xs text-[var(--neutral-600)] mt-0.5">{entry.note}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-[var(--neutral-500)]">Durum geçmişi bilgisi yok.</p>
                        )}
                    </div>
                </div>

                {/* Right — Sidebar */}
                <div className="space-y-4">
                    {/* Customer */}
                    <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-5">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--primary-800)] mb-3">
                            <User className="h-4 w-4 text-[var(--neutral-400)]" /> Müşteri
                        </h3>
                        {order.customer ? (
                            <div className="space-y-2 text-sm">
                                <p className="font-medium text-[var(--primary-800)]">{order.customer.name}</p>
                                <div className="flex items-center gap-1 text-[var(--neutral-500)]"><Phone className="h-3 w-3" /> {order.customer.phone}</div>
                                {order.customer.email && <p className="text-[var(--neutral-500)]">{order.customer.email}</p>}
                                <button type="button" onClick={() => router.push(`/admin/customers/${order.customer!.id}`)}
                                    className="mt-2 w-full rounded-lg border border-[var(--neutral-200)] py-2 text-xs font-medium text-[var(--primary-700)] hover:bg-[var(--neutral-50)]">
                                    Müşteri Detayı
                                </button>
                            </div>
                        ) : <p className="text-sm text-[var(--neutral-500)]">—</p>}
                    </div>

                    {/* Seller */}
                    {order.seller && (
                        <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-5">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--primary-800)] mb-3">
                                <ShoppingBag className="h-4 w-4 text-[var(--neutral-400)]" /> Satıcı
                            </h3>
                            <p className="font-medium text-[var(--primary-800)]">{order.seller.displayName}</p>
                            <button type="button" onClick={() => router.push(`/admin/sellers/${order.seller!.id}`)}
                                className="mt-2 w-full rounded-lg border border-[var(--neutral-200)] py-2 text-xs font-medium text-[var(--primary-700)] hover:bg-[var(--neutral-50)]">
                                Satıcı Detayı
                            </button>
                        </div>
                    )}

                    {/* Shipping */}
                    {order.shippingAddress && (
                        <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-5">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--primary-800)] mb-3">
                                <Truck className="h-4 w-4 text-[var(--neutral-400)]" /> Teslimat
                            </h3>
                            <div className="space-y-1 text-sm text-[var(--neutral-600)]">
                                <p className="font-medium text-[var(--primary-800)]">{order.shippingAddress.fullName}</p>
                                <p>{order.shippingAddress.address}</p>
                                <p>{order.shippingAddress.city}</p>
                                <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {order.shippingAddress.phone}</div>
                            </div>
                        </div>
                    )}

                    {/* Payment */}
                    <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-5">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--primary-800)] mb-3">
                            <CreditCard className="h-4 w-4 text-[var(--neutral-400)]" /> Ödeme
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[var(--neutral-500)]">Toplam</span>
                                <span className="font-semibold text-[var(--primary-800)]">{order.totalAmount?.toLocaleString('tr-TR')} ₺</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--neutral-500)]">Para Birimi</span>
                                <span className="text-[var(--neutral-700)]">{order.currency ?? 'TRY'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
