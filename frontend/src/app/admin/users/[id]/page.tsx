'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    ArrowLeft,
    BookOpen,
    ChevronDown,
    Key,
    Mail,
    Phone,
    Save,
    Shield,
    ShieldCheck,
    Trash2,
    Undo2,
    UserCog,
} from 'lucide-react';

import api from '@/services/api';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';

type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'SELLER' | 'SELLER_STAFF' | 'USER' | 'CUSTOMER';
type UserDetail = {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    lastLoginAt: string | null;
    deletedAt: string | null;
};

const roleLabel: Record<string, string> = {
    SUPER_ADMIN: 'Süper Admin', ADMIN: 'Admin', SELLER: 'Satıcı',
    SELLER_STAFF: 'Satıcı Personeli', USER: 'Personel', CUSTOMER: 'Müşteri',
};

const roleVariant: Record<string, 'error' | 'purple' | 'info' | 'warning' | 'neutral'> = {
    SUPER_ADMIN: 'error', ADMIN: 'purple', SELLER: 'info',
    SELLER_STAFF: 'warning', USER: 'warning', CUSTOMER: 'neutral',
};

const roles: UserRole[] = ['CUSTOMER', 'USER', 'SELLER_STAFF', 'SELLER', 'ADMIN', 'SUPER_ADMIN'];

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
    const msg = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
    if (Array.isArray(msg)) return msg.map(String).join(', ');
    if (typeof msg === 'string') return msg;
    return fallback;
};

export default function AdminUserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const userId = Number(params.id);

    const [editMode, setEditMode] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

    /* ── Query ── */
    const { data: user, isLoading } = useQuery<UserDetail>({
        queryKey: ['admin-user', userId],
        queryFn: async () => {
            const res = await api.get<UserDetail>(`/users/${userId}`);
            setFormData({ name: res.data.name, phone: res.data.phone, email: res.data.email ?? '' });
            return res.data;
        },
        enabled: !isNaN(userId),
    });

    /* ── Mutations ── */
    const updateProfileMutation = useMutation({
        mutationFn: async () => api.patch(`/users/${userId}`, formData),
        onSuccess: async () => {
            toast.success('Profil güncellendi.');
            setEditMode(false);
            await queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
        },
        onError: (err: unknown) => toast.error(resolveApiErrorMessage(err, 'Güncelleme başarısız.')),
    });

    const roleMutation = useMutation({
        mutationFn: async (role: UserRole) => api.patch(`/users/${userId}/role`, { role }),
        onSuccess: async () => {
            toast.success('Rol güncellendi.');
            await queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
        },
        onError: (err: unknown) => toast.error(resolveApiErrorMessage(err, 'Rol güncellenemedi.')),
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async () => api.patch(`/users/${userId}/active`, { isActive: !user?.isActive }),
        onSuccess: async () => {
            toast.success('Durum güncellendi.');
            await queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
        },
        onError: (err: unknown) => toast.error(resolveApiErrorMessage(err, 'İşlem başarısız.')),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => api.delete(`/users/${userId}`),
        onSuccess: async () => {
            toast.success('Kullanıcı silindi.');
            router.push('/admin/users');
        },
        onError: (err: unknown) => toast.error(resolveApiErrorMessage(err, 'Silme başarısız.')),
    });

    if (isLoading || !user) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-8 w-48 rounded bg-[var(--neutral-200)]" />
                <div className="h-64 rounded-xl bg-[var(--neutral-100)]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push('/admin/users')}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--neutral-200)] text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-[var(--primary-800)]">{user.name}</h1>
                            <StatusBadge variant={roleVariant[user.role] ?? 'neutral'}>
                                {roleLabel[user.role] ?? user.role}
                            </StatusBadge>
                            <StatusBadge variant={user.deletedAt ? 'error' : user.isActive ? 'success' : 'neutral'}>
                                {user.deletedAt ? 'Silinmiş' : user.isActive ? 'Aktif' : 'Pasif'}
                            </StatusBadge>
                        </div>
                        <p className="mt-0.5 text-sm text-[var(--neutral-500)]">Kullanıcı #{user.id}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Impersonation placeholder */}
                    <button
                        type="button"
                        disabled
                        title="Faz 3'te aktif olacak"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-xs font-medium text-[var(--neutral-400)] cursor-not-allowed"
                    >
                        <UserCog className="h-3.5 w-3.5" />
                        Kullanıcı Olarak Gör
                    </button>
                    <button
                        type="button"
                        onClick={() => toggleActiveMutation.mutate()}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${user.isActive
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                    >
                        {user.isActive ? 'Pasife Al' : 'Aktifleştir'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowDelete(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 transition"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Sil
                    </button>
                </div>
            </div>

            {/* ── Content Grid ── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* ── Profile Info ── */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-semibold text-[var(--primary-800)]">Profil Bilgileri</h2>
                            {!editMode ? (
                                <button
                                    type="button"
                                    onClick={() => setEditMode(true)}
                                    className="text-xs font-medium text-[var(--primary-600)] hover:text-[var(--primary-800)]"
                                >
                                    Düzenle
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setEditMode(false)} className="text-xs text-[var(--neutral-500)] hover:text-[var(--neutral-700)]">
                                        İptal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateProfileMutation.mutate()}
                                        disabled={updateProfileMutation.isPending}
                                        className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary-800)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--primary-700)] disabled:opacity-50"
                                    >
                                        <Save className="h-3 w-3" />
                                        Kaydet
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-[11px] font-medium text-[var(--neutral-500)]">AD SOYAD</label>
                                {editMode ? (
                                    <input
                                        value={formData.name}
                                        onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                                        className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)]"
                                    />
                                ) : (
                                    <p className="text-sm font-medium text-[var(--primary-800)]">{user.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-[11px] font-medium text-[var(--neutral-500)]">TELEFON</label>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
                                    {editMode ? (
                                        <input
                                            value={formData.phone}
                                            onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                                            className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)]"
                                        />
                                    ) : (
                                        <p className="text-sm text-[var(--primary-800)]">{user.phone}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-[11px] font-medium text-[var(--neutral-500)]">E-POSTA</label>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5 text-[var(--neutral-400)]" />
                                    {editMode ? (
                                        <input
                                            value={formData.email}
                                            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                                            className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)]"
                                        />
                                    ) : (
                                        <p className="text-sm text-[var(--primary-800)]">{user.email ?? '—'}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-[11px] font-medium text-[var(--neutral-500)]">ROL</label>
                                <div className="relative">
                                    <select
                                        value={user.role}
                                        onChange={(e) => roleMutation.mutate(e.target.value as UserRole)}
                                        disabled={roleMutation.isPending}
                                        className="w-full appearance-none rounded-lg border border-[var(--neutral-200)] bg-white px-3 py-2 pr-8 text-sm outline-none focus:border-[var(--primary-400)] disabled:opacity-50"
                                    >
                                        {roles.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--neutral-400)] pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[var(--neutral-100)] pt-4">
                            <div>
                                <p className="text-[11px] font-medium text-[var(--neutral-500)]">KAYIT TARİHİ</p>
                                <p className="text-sm text-[var(--primary-800)]">{new Date(user.createdAt).toLocaleString('tr-TR')}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-[var(--neutral-500)]">SON GİRİŞ</p>
                                <p className="text-sm text-[var(--primary-800)]">
                                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('tr-TR') : '—'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Activity Preview ── */}
                    <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="h-4 w-4 text-[var(--neutral-400)]" />
                            <h2 className="text-base font-semibold text-[var(--primary-800)]">Son İşlemler</h2>
                            <span className="text-[11px] text-[var(--neutral-400)]">(Audit Log Preview)</span>
                        </div>
                        <p className="text-sm text-[var(--neutral-500)]">
                            Bu bölüm Faz 10'da audit log entegrasyonuyla aktifleşecek.
                        </p>
                    </div>
                </div>

                {/* ── Sidebar Cards ── */}
                <div className="space-y-4">
                    {/* 2FA Card */}
                    <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <ShieldCheck className="h-4 w-4 text-[var(--neutral-400)]" />
                            <h3 className="text-sm font-semibold text-[var(--primary-800)]">İki Faktörlü Doğrulama</h3>
                        </div>
                        <StatusBadge variant="neutral">Pasif</StatusBadge>
                        <p className="mt-2 text-xs text-[var(--neutral-500)]">
                            2FA kurulumu Faz 3'te aktif olacak.
                        </p>
                        <button
                            type="button"
                            disabled
                            className="mt-3 w-full rounded-lg border border-[var(--neutral-200)] py-2 text-xs font-medium text-[var(--neutral-400)] cursor-not-allowed"
                        >
                            2FA Sıfırla
                        </button>
                    </div>

                    {/* Permission Groups Card */}
                    <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Key className="h-4 w-4 text-[var(--neutral-400)]" />
                            <h3 className="text-sm font-semibold text-[var(--primary-800)]">Yetki Grupları</h3>
                        </div>
                        <p className="text-xs text-[var(--neutral-500)]">
                            Bu kullanıcıya atanmış yetki grupları burada görünecek.
                        </p>
                        <button
                            type="button"
                            onClick={() => router.push('/admin/permission-groups')}
                            className="mt-3 w-full rounded-lg border border-[var(--neutral-200)] py-2 text-xs font-medium text-[var(--primary-700)] hover:bg-[var(--neutral-50)] transition"
                        >
                            Yetki Gruplarını Yönet
                        </button>
                    </div>

                    {/* Quick Actions */}
                    <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-5">
                        <h3 className="text-sm font-semibold text-[var(--primary-800)] mb-3">Hızlı İşlemler</h3>
                        <div className="space-y-2">
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-xs font-medium text-[var(--neutral-700)] hover:bg-[var(--neutral-50)] transition"
                            >
                                <Shield className="h-3.5 w-3.5" />
                                Şifre Sıfırla
                            </button>
                            {user.deletedAt && (
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition"
                                >
                                    <Undo2 className="h-3.5 w-3.5" />
                                    Geri Yükle
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Delete Modal ── */}
            <ConfirmDeleteModal
                open={showDelete}
                onClose={() => setShowDelete(false)}
                onConfirm={() => deleteMutation.mutate()}
                title="Kullanıcıyı Sil"
                description={`"${user.name}" kullanıcısı silinecektir. Soft delete uygulanır, geri yüklenebilir.`}
                loading={deleteMutation.isPending}
            />
        </div>
    );
}
