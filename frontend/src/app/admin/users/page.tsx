'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ChevronDown,
  Search,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

import api from '@/services/api';
import Spinner from '@/components/common/Spinner';

type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'SELLER' | 'USER' | 'CUSTOMER';
type UserRow = { id: number; name: string; phone?: string; role: UserRole; isActive: boolean; };

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  const msg = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(msg)) return msg.map(String).join(', ');
  if (typeof msg === 'string') return msg;
  return fallback;
};

const roleLabel: Record<UserRole, string> = {
  SUPER_ADMIN: 'Süper Admin', ADMIN: 'Admin', SELLER: 'Satıcı', USER: 'Personel', CUSTOMER: 'Müşteri',
};

const roleDot: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-red-500', ADMIN: 'bg-violet-500',
  SELLER: 'bg-blue-500', USER: 'bg-amber-500', CUSTOMER: 'bg-gray-400',
};

const roles: UserRole[] = ['CUSTOMER', 'USER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');

  const { data: users, isLoading, isError } = useQuery<UserRow[]>({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get<UserRow[]>('/users')).data,
  });

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users ?? []).filter((u) => {
      const matchSearch = !q || u.name.toLowerCase().includes(q) || (u.phone ?? '').includes(q);
      const matchRole = !roleFilter || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const updateActiveMutation = useMutation({
    mutationFn: async (p: { id: number; isActive: boolean }) =>
      api.patch(`/users/${p.id}/active`, { isActive: p.isActive }),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-users'] });
      const prev = queryClient.getQueryData<UserRow[]>(['admin-users']);
      if (prev) queryClient.setQueryData<UserRow[]>(['admin-users'], prev.map((u) => u.id === id ? { ...u, isActive } : u));
      return { prev };
    },
    onError: (err: unknown, _p, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['admin-users'], ctx.prev);
      toast.error(resolveApiErrorMessage(err, 'Durum güncellenemedi.'));
    },
    onSuccess: async () => {
      toast.success('Durum güncellendi.');
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (p: { id: number; role: UserRole }) =>
      api.patch(`/users/${p.id}/role`, { role: p.role }),
    onMutate: async ({ id, role }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-users'] });
      const prev = queryClient.getQueryData<UserRow[]>(['admin-users']);
      if (prev) queryClient.setQueryData<UserRow[]>(['admin-users'], prev.map((u) => u.id === id ? { ...u, role } : u));
      return { prev };
    },
    onError: (err: unknown, _p, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['admin-users'], ctx.prev);
      toast.error(resolveApiErrorMessage(err, 'Rol güncellenemedi.'));
    },
    onSuccess: async () => {
      toast.success('Rol güncellendi.');
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">Kullanıcı Yönetimi</h1>
        <p className="mt-1 text-sm text-[var(--neutral-600)]">Kayıtlı kullanıcıları görüntüleyin, rol ve durumlarını yönetin.</p>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 border-b border-[var(--neutral-200)] pb-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--neutral-600)]">
          <span className="font-semibold text-[var(--primary-800)]">{filteredUsers.length}</span> kullanıcı
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--neutral-400)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İsim veya telefon..."
              className="h-8 w-48 rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white pl-8 pr-3 text-xs text-[var(--neutral-700)] outline-none focus:border-[var(--primary-800)]/40"
            />
          </div>
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
              className="h-8 appearance-none rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white pl-3 pr-7 text-xs text-[var(--neutral-700)] outline-none focus:border-[var(--primary-800)]/40"
            >
              <option value="">Tüm roller</option>
              {roles.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--neutral-400)] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── States ── */}
      {isLoading && <Spinner label="Kullanıcılar yükleniyor..." />}
      {isError && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" /> Kullanıcılar alınamadı.
        </div>
      )}

      {/* ── Table ── */}
      {!isLoading && !isError && (
        filteredUsers.length === 0
          ? <p className="py-10 text-center text-sm text-[var(--neutral-500)]">Kullanıcı bulunamadı.</p>
          : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--neutral-200)]">
                    {['Kullanıcı', 'Rol', 'Durum', ''].map((h) => (
                      <th key={h} className={`pb-3 pr-6 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)] ${h === '' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--neutral-100)]">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-[var(--neutral-50)]">
                      {/* Kullanıcı */}
                      <td className="py-3 pr-6">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-full bg-[var(--neutral-100)] flex items-center justify-center flex-shrink-0">
                            <span className="text-[11px] font-bold text-[var(--neutral-600)]">
                              {u.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--primary-800)]">{u.name}</p>
                            <p className="text-[11px] text-[var(--neutral-500)]">#{u.id}{u.phone ? ` · ${u.phone}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      {/* Rol */}
                      <td className="py-3 pr-6">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${roleDot[u.role]}`} />
                          <span className="text-[12px] font-medium text-[var(--neutral-700)]">{roleLabel[u.role]}</span>
                        </div>
                      </td>
                      {/* Durum */}
                      <td className="py-3 pr-6">
                        <span className={`text-[12px] font-medium ${u.isActive ? 'text-emerald-700' : 'text-[var(--neutral-500)]'}`}>
                          {u.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      {/* İşlemler */}
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="relative">
                            <select
                              value={u.role}
                              disabled={updateRoleMutation.isPending}
                              onChange={(e) => updateRoleMutation.mutate({ id: u.id, role: e.target.value as UserRole })}
                              className="h-7 appearance-none rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white pl-2.5 pr-6 text-[11px] text-[var(--neutral-700)] outline-none hover:bg-[var(--neutral-50)] disabled:opacity-60"
                            >
                              {roles.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
                            </select>
                            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-[var(--neutral-400)] pointer-events-none" />
                          </div>
                          <button
                            type="button"
                            disabled={updateActiveMutation.isPending}
                            onClick={() => updateActiveMutation.mutate({ id: u.id, isActive: !u.isActive })}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--neutral-600)] hover:text-[var(--primary-800)] disabled:opacity-60 transition"
                          >
                            {u.isActive
                              ? <><ToggleRight className="h-4 w-4 text-emerald-500" />Pasife Al</>
                              : <><ToggleLeft className="h-4 w-4 text-[var(--neutral-400)]" />Aktifleştir</>
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}
    </div>
  );
}
