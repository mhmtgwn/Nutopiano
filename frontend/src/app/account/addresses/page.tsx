'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  if (!('response' in error)) return fallback;
  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== 'object') return fallback;
  if (!('data' in response)) return fallback;
  const data = (response as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return fallback;
  if (!('message' in data)) return fallback;
  const message = (data as { message?: unknown }).message;
  if (Array.isArray(message)) {
    return message.map(String).join(', ');
  }
  if (typeof message === 'string') return message;
  return fallback;
};

type AddressRow = {
  id: number;
  title: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  district: string;
  postalCode?: string | null;
  country: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function AccountAddressesPage() {
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    title: '',
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    district: '',
    postalCode: '',
    country: 'TR',
  });

  const {
    data: addresses,
    isLoading,
    isError,
    error,
  } = useQuery<AddressRow[]>({
    queryKey: ['account-addresses'],
    queryFn: async () => {
      const res = await api.get<AddressRow[]>('/customer/addresses');
      return res.data;
    },
  });

  const editingAddress = useMemo(() => {
    if (!addresses || editingId === null) return null;
    return addresses.find((a) => a.id === editingId) ?? null;
  }, [addresses, editingId]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      title: '',
      fullName: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      district: '',
      postalCode: '',
      country: 'TR',
    });
    setIsFormOpen(true);
  };

  const openEdit = (addr: AddressRow) => {
    setEditingId(addr.id);
    setForm({
      title: addr.title ?? '',
      fullName: addr.fullName ?? '',
      phone: addr.phone ?? '',
      line1: addr.line1 ?? '',
      line2: addr.line2 ?? '',
      city: addr.city ?? '',
      district: addr.district ?? '',
      postalCode: addr.postalCode ?? '',
      country: addr.country ?? 'TR',
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        line1: form.line1.trim(),
        line2: form.line2.trim() || undefined,
        city: form.city.trim(),
        district: form.district.trim(),
        postalCode: form.postalCode.trim() || undefined,
        country: form.country.trim() || 'TR',
      };

      if (!payload.title || !payload.fullName || !payload.phone || !payload.line1 || !payload.city || !payload.district) {
        throw new Error('Lütfen zorunlu alanları doldurun.');
      }

      const res = await api.post<AddressRow>('/customer/addresses', payload);
      return res.data;
    },
    onSuccess: async () => {
      toast.success('Adres eklendi.');
      closeForm();
      await queryClient.invalidateQueries({ queryKey: ['account-addresses'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Adres eklenemedi.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const res = await api.patch<AddressRow>(`/customer/addresses/${editingId}`, {
        title: form.title.trim() || undefined,
        fullName: form.fullName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        line1: form.line1.trim() || undefined,
        line2: form.line2.trim() || undefined,
        city: form.city.trim() || undefined,
        district: form.district.trim() || undefined,
        postalCode: form.postalCode.trim() || undefined,
        country: form.country.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: async () => {
      toast.success('Adres güncellendi.');
      closeForm();
      await queryClient.invalidateQueries({ queryKey: ['account-addresses'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Adres güncellenemedi.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/customer/addresses/${id}`);
    },
    onSuccess: async () => {
      toast.success('Adres silindi.');
      await queryClient.invalidateQueries({ queryKey: ['account-addresses'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Adres silinemedi.'));
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (payload: { id: number; type: 'shipping' | 'billing' }) => {
      const res = await api.patch<AddressRow>(`/customer/addresses/${payload.id}/default`, {
        type: payload.type,
      });
      return res.data;
    },
    onSuccess: async () => {
      toast.success('Varsayılan adres güncellendi.');
      await queryClient.invalidateQueries({ queryKey: ['account-addresses'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Varsayılan adres güncellenemedi.'));
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-6 md:px-6 md:py-10">
        <Spinner fullscreen />
      </div>
    );
  }

  if (isError) {
    const message = resolveApiErrorMessage(error, 'Adresler yüklenemedi.');

    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:px-6 md:py-10">
        <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">Adreslerim</h1>
        <section className="space-y-3 rounded-[var(--radius-2xl)] border border-[var(--error-600)]/20 bg-[var(--error-100)] px-4 py-6 md:px-6">
          <p className="text-sm text-[var(--error-600)] md:text-base">{message}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">Adreslerim</h1>
          <p className="mt-1 text-xs text-[var(--neutral-600)] md:text-sm">
            Teslimat ve fatura adreslerinizi yönetin.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          Yeni adres
        </Button>
      </header>

      {!addresses || addresses.length === 0 ? (
        <section className="space-y-3 rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-6 shadow-[var(--shadow-md)] md:px-6">
          <p className="text-sm text-[var(--neutral-600)] md:text-base">Kayıtlı adres yok.</p>
          <Button type="button" variant="secondary" onClick={openCreate}>
            İlk adresi ekle
          </Button>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-5 shadow-[var(--shadow-md)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--primary-800)]">{addr.title}</p>
                  <p className="mt-1 text-xs text-[var(--neutral-600)]">
                    {addr.fullName} • {addr.phone}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {addr.isDefaultShipping && (
                    <span className="rounded-full border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--primary-800)]">
                      Default teslimat
                    </span>
                  )}
                  {addr.isDefaultBilling && (
                    <span className="rounded-full border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--primary-800)]">
                      Default fatura
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-1 text-sm text-[var(--neutral-700)]">
                <p>{addr.line1}</p>
                {addr.line2 && <p>{addr.line2}</p>}
                <p>
                  {addr.district} / {addr.city}
                  {addr.postalCode ? `, ${addr.postalCode}` : ''}
                </p>
                <p className="text-xs text-[var(--neutral-500)]">{addr.country}</p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDefaultMutation.mutate({ id: addr.id, type: 'shipping' })}
                  disabled={setDefaultMutation.isPending}
                  className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Teslimat default
                </button>
                <button
                  type="button"
                  onClick={() => setDefaultMutation.mutate({ id: addr.id, type: 'billing' })}
                  disabled={setDefaultMutation.isPending}
                  className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Fatura default
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(addr)}
                  className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-800)] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white"
                >
                  Düzenle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm('Bu adres silinsin mi?');
                    if (!ok) return;
                    deleteMutation.mutate(addr.id);
                  }}
                  disabled={deleteMutation.isPending}
                  className="inline-flex h-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--error-50)] px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--error-600)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
          <div className="w-full max-w-2xl rounded-[var(--radius-2xl)] bg-white p-5 shadow-[var(--shadow-2xl)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  {editingId ? 'Adres düzenle' : 'Yeni adres'}
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--primary-800)]">
                  {editingAddress?.title ?? 'Adres bilgileri'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white"
                aria-label="Kapat"
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Başlık*
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm outline-none"
                  placeholder="Ev / İş"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Ad Soyad*
                </label>
                <input
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  className="h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Telefon*
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm outline-none"
                  placeholder="5XXXXXXXXX"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Ülke
                </label>
                <input
                  value={form.country}
                  onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                  className="h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Adres satırı 1*
                </label>
                <input
                  value={form.line1}
                  onChange={(e) => setForm((p) => ({ ...p, line1: e.target.value }))}
                  className="h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm outline-none"
                  placeholder="Mahalle, sokak, bina no..."
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Adres satırı 2
                </label>
                <input
                  value={form.line2}
                  onChange={(e) => setForm((p) => ({ ...p, line2: e.target.value }))}
                  className="h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm outline-none"
                  placeholder="Daire, kat, tarif..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  İl*
                </label>
                <input
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  İlçe*
                </label>
                <input
                  value={form.district}
                  onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
                  className="h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Posta kodu
                </label>
                <input
                  value={form.postalCode}
                  onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))}
                  className="h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeForm}>
                Vazgeç
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (editingId) {
                    updateMutation.mutate();
                    return;
                  }
                  createMutation.mutate();
                }}
                isLoading={createMutation.isPending || updateMutation.isPending}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
