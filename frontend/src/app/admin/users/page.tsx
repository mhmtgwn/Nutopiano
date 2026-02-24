'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import api from '@/services/api';

type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'SELLER' | 'USER' | 'CUSTOMER';

type UserRow = {
  id: number;
  name: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
};

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

const roleLabel: Record<UserRole, string> = {
  SUPER_ADMIN: 'Süper Admin',
  ADMIN: 'Admin',
  SELLER: 'Satıcı',
  USER: 'Personel',
  CUSTOMER: 'Müşteri',
};

const roles: UserRole[] = ['CUSTOMER', 'USER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const {
    data: users,
    isLoading,
    isError,
  } = useQuery<UserRow[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get<UserRow[]>('/users');
      return res.data;
    },
  });

  const updateActiveMutation = useMutation({
    mutationFn: async (payload: { id: number; isActive: boolean }) => {
      await api.patch(`/users/${payload.id}/active`, { isActive: payload.isActive });
    },
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-users'] });
      const prev = queryClient.getQueryData<UserRow[]>(['admin-users']);

      if (prev) {
        queryClient.setQueryData<UserRow[]>(['admin-users'],
          prev.map((u) => (u.id === id ? { ...u, isActive } : u)),
        );
      }

      return { prev };
    },
    onError: (error: unknown, _payload, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['admin-users'], context.prev);
      }
      toast.error(resolveApiErrorMessage(error, 'Durum güncellenemedi.'));
    },
    onSuccess: async () => {
      toast.success('Durum güncellendi.');
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users ?? [];
    return (users ?? []).filter((u) => {
      const name = (u.name ?? '').toLowerCase();
      const phone = (u.phone ?? '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [users, search]);

  const updateRoleMutation = useMutation({
    mutationFn: async (payload: { id: number; role: UserRole }) => {
      await api.patch(`/users/${payload.id}/role`, { role: payload.role });
    },
    onMutate: async ({ id, role }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-users'] });
      const prev = queryClient.getQueryData<UserRow[]>(['admin-users']);

      if (prev) {
        queryClient.setQueryData<UserRow[]>(['admin-users'],
          prev.map((u) => (u.id === id ? { ...u, role } : u)),
        );
      }

      return { prev };
    },
    onError: (error: unknown, _payload, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['admin-users'], context.prev);
      }
      toast.error(resolveApiErrorMessage(error, 'Rol güncellenemedi.'));
    },
    onSuccess: async () => {
      toast.success('Rol güncellendi.');
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return (
    <div className="space-y-6">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Merkez
            </p>
            <h1 className="mt-2 text-2xl font-serif text-[var(--primary-800)] md:text-3xl lg:text-4xl">
              Kullanıcılar
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Kayıtlı kullanıcıları görüntüleyin ve rollerini yönetin.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white">
        <div className="flex flex-col gap-3 border-b border-[var(--neutral-200)] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Liste
            </p>
            <p className="mt-1 text-sm text-[var(--neutral-600)]">
              Toplam: <span className="font-semibold text-[var(--primary-800)]">{users?.length ?? 0}</span>
            </p>
          </div>
          <div className="w-full md:max-w-xs">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İsim veya telefon ara"
              className="w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-3 text-sm text-[var(--primary-900)] outline-none transition placeholder:text-[var(--neutral-500)] focus:border-[var(--primary-800)]/30"
            />
          </div>
        </div>

        {isLoading && (
          <div className="px-4 py-6 text-sm text-[var(--neutral-600)] md:px-6">
            Kullanıcılar yükleniyor...
          </div>
        )}

        {isError && !isLoading && (
          <div className="px-4 py-6 text-sm text-[var(--neutral-600)] md:px-6">
            Kullanıcılar alınamadı.
          </div>
        )}

        {!isLoading && !isError && (
          <div className="divide-y divide-[var(--neutral-200)]">
            {filteredUsers.length === 0 ? (
              <div className="px-4 py-10 text-sm text-[var(--neutral-600)] md:px-6">
                Sonuç bulunamadı.
              </div>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id} className="px-4 py-4 md:px-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--primary-800)]">
                        {u.name}
                      </p>
                      <p className="mt-1 text-xs text-[var(--neutral-600)]">
                        ID: {u.id}
                        {u.phone ? ` • ${u.phone}` : ''}
                        {' • '}
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                            u.isActive
                              ? 'border-[var(--neutral-200)] bg-white text-[var(--primary-800)]/70'
                              : 'border-[var(--neutral-200)] bg-[var(--neutral-50)] text-[var(--primary-800)]'
                          }`}
                        >
                          {u.isActive ? 'aktif' : 'pasif'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={updateActiveMutation.isPending}
                        onClick={() =>
                          updateActiveMutation.mutate({
                            id: u.id,
                            isActive: !u.isActive,
                          })
                        }
                        className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--neutral-200)] bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)] disabled:opacity-60"
                      >
                        {u.isActive ? 'Pasife al' : 'Aktifleştir'}
                      </button>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
                        {roleLabel[u.role]}
                      </div>
                      <select
                        value={u.role}
                        disabled={updateRoleMutation.isPending}
                        onChange={(e) =>
                          updateRoleMutation.mutate({
                            id: u.id,
                            role: e.target.value as UserRole,
                          })
                        }
                        className="h-10 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] outline-none transition focus:border-[var(--primary-800)]/30 disabled:opacity-60"
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {roleLabel[r]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}

