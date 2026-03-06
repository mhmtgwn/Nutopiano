'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CalendarClock, CheckCircle2, RefreshCcw, UserRound } from 'lucide-react';

import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { normalizeRole } from '@/lib/role-routing';

type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

type AppointmentRow = {
  id: number;
  customerId: number;
  staffUserId?: number | null;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  serviceName: string;
  notes?: string | null;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
};

type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SELLER'
  | 'SELLER_STAFF'
  | 'CUSTOMER';

type UserRow = {
  id: number;
  name: string;
  phone?: string;
  role: UserRole | 'USER';
  isActive: boolean;
};

const toSystemRole = (role: string): UserRole =>
  normalizeRole(role) ?? 'CUSTOMER';

type CustomerRow = {
  id: number;
  name: string;
  phone: string;
};

type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type PaginatedCustomers = {
  data: CustomerRow[];
  meta: PaginationMeta;
};

const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'SCHEDULED',
  'CONFIRMED',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED',
];

const statusLabel: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Planlandı',
  CONFIRMED: 'Onaylandı',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal',
  NO_SHOW: 'Gelmedi',
};

const statusBadgeClass: Record<AppointmentStatus, string> = {
  SCHEDULED: 'bg-[#E8F1FF] text-[#0B3B91]',
  CONFIRMED: 'bg-[#FFF7E6] text-[#7A4B00]',
  COMPLETED: 'bg-[#E6FBF2] text-[#0F5132]',
  CANCELLED: 'bg-[#FDECEC] text-[#9B1C1C]',
  NO_SHOW: 'bg-[#F3EEE3] text-[#3E2723]',
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
  if (Array.isArray(message)) return message.map(String).join(', ');
  if (typeof message === 'string') return message;
  return fallback;
};

const toDateTimeLocal = (value: Date) => {
  const offsetMs = value.getTimezoneOffset() * 60_000;
  const local = new Date(value.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
};

export default function AdminServicesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'ALL'>('ALL');
  const [customerSearch, setCustomerSearch] = useState('');

  const [form, setForm] = useState(() => ({
    customerId: '',
    staffUserId: '',
    serviceName: '',
    // Lazily compute default time once on mount.
    startAt: toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)),
    durationMinutes: 60,
    status: 'SCHEDULED' as AppointmentStatus,
    notes: '',
  }));

  const appointmentsQuery = useQuery<AppointmentRow[]>({
    queryKey: ['admin-services-appointments'],
    queryFn: async () => {
      const res = await api.get<AppointmentRow[]>('/appointments');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const usersQuery = useQuery<UserRow[]>({
    queryKey: ['admin-services-users'],
    queryFn: async () => {
      const res = await api.get<UserRow[]>('/users');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const customersQuery = useQuery<PaginatedCustomers>({
    queryKey: ['admin-services-customers', customerSearch],
    queryFn: async () => {
      const res = await api.get<PaginatedCustomers>('/platform/customers', {
        params: { q: customerSearch.trim() || undefined, page: 1, pageSize: 20 },
      });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const startAt = new Date(form.startAt);
      if (Number.isNaN(startAt.getTime())) {
        throw new Error('Geçerli bir başlangıç tarihi girin.');
      }
      if (!form.customerId) {
        throw new Error('Müşteri seçin.');
      }
      if (!form.serviceName.trim()) {
        throw new Error('Hizmet adını girin.');
      }

      const durationMs = Math.max(15, Number(form.durationMinutes) || 60) * 60 * 1000;
      const endAt = new Date(startAt.getTime() + durationMs);

      await api.post('/appointments', {
        customerId: Number(form.customerId),
        staffUserId: form.staffUserId ? Number(form.staffUserId) : undefined,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        status: form.status,
        serviceName: form.serviceName.trim(),
        notes: form.notes.trim() || undefined,
      });
    },
    onSuccess: async () => {
      toast.success('Hizmet randevusu oluşturuldu.');
      setForm((prev) => ({
        ...prev,
        serviceName: '',
        notes: '',
      }));
      await queryClient.invalidateQueries({ queryKey: ['admin-services-appointments'] });
    },
    onError: (error: unknown) => {
      const rawMessage =
        error instanceof Error ? error.message : resolveApiErrorMessage(error, 'Kayıt oluşturulamadı.');
      toast.error(rawMessage);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (payload: { id: number; status: AppointmentStatus }) => {
      await api.patch(`/appointments/${payload.id}`, { status: payload.status });
    },
    onSuccess: async () => {
      toast.success('Randevu durumu güncellendi.');
      await queryClient.invalidateQueries({ queryKey: ['admin-services-appointments'] });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Durum güncellenemedi.'));
    },
  });

  const staffOptions = useMemo(
    () =>
      (usersQuery.data ?? []).filter(
        (u) => toSystemRole(u.role) === 'SELLER_STAFF' && u.isActive,
      ),
    [usersQuery.data],
  );

  const filteredAppointments = useMemo(() => {
    const rows = appointmentsQuery.data ?? [];
    if (statusFilter === 'ALL') return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [appointmentsQuery.data, statusFilter]);

  const counts = useMemo(() => {
    const rows = appointmentsQuery.data ?? [];
    const byStatus = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    }, {});
    return {
      total: rows.length,
      scheduled: byStatus.SCHEDULED ?? 0,
      confirmed: byStatus.CONFIRMED ?? 0,
      completed: byStatus.COMPLETED ?? 0,
    };
  }, [appointmentsQuery.data]);

  const customers = customersQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-gradient-to-br from-[#F7F1E5] via-white to-[#ECF6F3] px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Kapıya Hizmet
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Hizmet randevuları
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Randevu oluşturun, personel atayın ve operasyon durumlarını yönetin.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary-800)]/20 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-800)]">
            <CalendarClock className="h-4 w-4" />
            Canlı operasyon
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Toplam randevu
          </p>
          <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{counts.total}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Planlandı
          </p>
          <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{counts.scheduled}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Onaylandı
          </p>
          <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{counts.confirmed}</p>
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--neutral-500)]">
            Tamamlandı
          </p>
          <p className="mt-2 text-2xl font-serif text-[var(--primary-800)]">{counts.completed}</p>
        </div>
      </section>

      <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-2xl font-serif text-[var(--primary-800)]">Yeni hizmet randevusu</h2>
          <UserRound className="h-5 w-5 text-[var(--primary-800)]/70" />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Müşteri arama
            </label>
            <input
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="İsim veya telefon"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Müşteri
            </label>
            <select
              value={form.customerId}
              onChange={(e) => setForm((prev) => ({ ...prev, customerId: e.target.value }))}
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            >
              <option value="">Müşteri seçin</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  #{customer.id} - {customer.name} ({customer.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Personel
            </label>
            <select
              value={form.staffUserId}
              onChange={(e) => setForm((prev) => ({ ...prev, staffUserId: e.target.value }))}
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            >
              <option value="">Atamasız</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  #{staff.id} - {staff.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Hizmet adı
            </label>
            <input
              value={form.serviceName}
              onChange={(e) => setForm((prev) => ({ ...prev, serviceName: e.target.value }))}
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="Örn: Piyano akort"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Başlangıç
            </label>
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => setForm((prev) => ({ ...prev, startAt: e.target.value }))}
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Süre (dakika)
            </label>
            <input
              type="number"
              min={15}
              step={15}
              value={form.durationMinutes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value) || 60 }))
              }
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              İlk durum
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, status: e.target.value as AppointmentStatus }))
              }
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            >
              {APPOINTMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel[status]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Not
            </label>
            <input
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="mt-2 h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
              placeholder="Opsiyonel not"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || customersQuery.isLoading || usersQuery.isLoading}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary-800)] px-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createMutation.isPending ? 'Kaydediliyor...' : 'Randevu oluştur'}
          </button>
        </div>
      </section>

      <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-serif text-[var(--primary-800)]">Randevu listesi</h2>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--neutral-500)]">
              Filtre
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | 'ALL')}
              className="h-10 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-3 text-sm text-[var(--primary-800)]"
            >
              <option value="ALL">Tümü</option>
              {APPOINTMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {appointmentsQuery.isLoading ? (
          <div className="pt-6">
            <Spinner label="Randevular yükleniyor..." />
          </div>
        ) : null}

        {appointmentsQuery.isError ? (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {resolveApiErrorMessage(appointmentsQuery.error, 'Randevular alınamadı.')}
          </div>
        ) : null}

        {!appointmentsQuery.isLoading && !appointmentsQuery.isError && filteredAppointments.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--neutral-600)]">Filtreye uygun randevu bulunamadı.</p>
        ) : null}

        {!appointmentsQuery.isLoading &&
        !appointmentsQuery.isError &&
        filteredAppointments.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.2em] text-[var(--neutral-500)]">
                <tr>
                  <th className="pb-3 pr-4">Hizmet</th>
                  <th className="pb-3 pr-4">Müşteri</th>
                  <th className="pb-3 pr-4">Personel</th>
                  <th className="pb-3 pr-4">Saat</th>
                  <th className="pb-3 pr-4">Durum</th>
                  <th className="pb-3">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--neutral-200)]">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-[var(--primary-800)]">{row.serviceName}</p>
                      <p className="text-xs text-[var(--neutral-600)]">#{row.id}</p>
                    </td>
                    <td className="py-3 pr-4 text-[var(--neutral-700)]">#{row.customerId}</td>
                    <td className="py-3 pr-4 text-[var(--neutral-700)]">
                      {row.staffUserId ? `#${row.staffUserId}` : '-'}
                    </td>
                    <td className="py-3 pr-4 text-[var(--neutral-600)]">
                      {new Date(row.startAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass[row.status]}`}
                      >
                        {statusLabel[row.status]}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={updateStatusMutation.isPending}
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: row.id,
                              status: 'CONFIRMED',
                            })
                          }
                          className="inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] disabled:opacity-50"
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Onayla
                        </button>
                        <button
                          type="button"
                          disabled={updateStatusMutation.isPending}
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: row.id,
                              status: 'COMPLETED',
                            })
                          }
                          className="inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--primary-800)] disabled:opacity-50"
                        >
                          Tamamla
                        </button>
                        <button
                          type="button"
                          disabled={updateStatusMutation.isPending}
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: row.id,
                              status: 'CANCELLED',
                            })
                          }
                          className="inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-700 disabled:opacity-50"
                        >
                          <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                          İptal
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

