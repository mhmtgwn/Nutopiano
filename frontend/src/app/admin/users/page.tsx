"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertTriangle, Shield, ShieldCheck, UserPlus, X } from "lucide-react";

import api from "@/services/api";
import DataTable, { type DataTableColumn } from "@/components/common/DataTable";
import FilterPanel, { type FilterField } from "@/components/common/FilterPanel";
import StatusBadge from "@/components/common/StatusBadge";
import { normalizeRole } from "@/lib/role-routing";
import { useAppSelector } from "@/store";

/* ── Types ── */
type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SELLER"
  | "SELLER_STAFF"
  | "CUSTOMER";
type ApiUserRole = UserRole | "USER";
type UserRow = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  role: ApiUserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  deletedAt?: string;
};

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "Süper Admin",
  ADMIN: "Admin",
  SELLER: "Satıcı",
  SELLER_STAFF: "Satıcı Personeli",
  CUSTOMER: "Müşteri",
};

const roleVariant: Record<
  string,
  "error" | "purple" | "info" | "warning" | "neutral"
> = {
  SUPER_ADMIN: "error",
  ADMIN: "purple",
  SELLER: "info",
  SELLER_STAFF: "warning",
  CUSTOMER: "neutral",
};

const roles: UserRole[] = [
  "CUSTOMER",
  "SELLER_STAFF",
  "SELLER",
  "ADMIN",
  "SUPER_ADMIN",
];

const toSystemRole = (role: string): UserRole =>
  normalizeRole(role) ?? "CUSTOMER";

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  const msg = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  if (Array.isArray(msg)) return msg.map(String).join(", ");
  if (typeof msg === "string") return msg;
  return fallback;
};

/* ── Filter Config ── */
const filterFields: FilterField[] = [
  {
    key: "role",
    label: "Rol",
    type: "select",
    options: roles.map((r) => ({ label: roleLabel[r], value: r })),
  },
  {
    key: "status",
    label: "Durum",
    type: "select",
    options: [
      { label: "Aktif", value: "active" },
      { label: "Pasif", value: "inactive" },
      { label: "Silinmiş", value: "deleted" },
    ],
  },
  {
    key: "search",
    label: "Arama",
    type: "text",
    placeholder: "İsim, telefon veya e-posta...",
  },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const actorRole = useAppSelector((state) => {
    const role = state.user.user?.role;
    return role === "ADMIN" || role === "SUPER_ADMIN" ? role : null;
  });
  const requiresRoleOverride = actorRole === "ADMIN";
  const [filters, setFilters] = useState<Record<string, string>>({
    role: "",
    status: "",
    search: "",
  });
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(
    new Set(),
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [bulkRoleReason, setBulkRoleReason] = useState("");

  const updateUserRole = async (
    userId: number,
    role: UserRole,
    reason?: string,
  ) => {
    if (requiresRoleOverride) {
      const normalizedReason = reason?.trim() ?? "";
      if (normalizedReason.length < 3) {
        throw new Error("Rol değişikliği için en az 3 karakter neden girin.");
      }
      return api.patch(`/users/${userId}/role/override`, {
        role,
        reason: normalizedReason,
      });
    }

    return api.patch(`/users/${userId}/role`, { role });
  };

  /* ── Queries ── */
  const {
    data: users,
    isLoading,
    isError,
  } = useQuery<UserRow[]>({
    queryKey: ["admin-users"],
    queryFn: async () => (await api.get<UserRow[]>("/users")).data,
  });

  /* ── Filter ── */
  const filteredUsers = useMemo(() => {
    const q = (filters.search ?? "").trim().toLowerCase();
    return (users ?? []).filter((u) => {
      if (filters.role && toSystemRole(u.role) !== filters.role) return false;
      if (filters.status === "active" && !u.isActive) return false;
      if (filters.status === "inactive" && u.isActive) return false;
      if (filters.status === "deleted" && !u.deletedAt) return false;
      if (
        q &&
        !u.name.toLowerCase().includes(q) &&
        !(u.phone ?? "").includes(q) &&
        !(u.email ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [users, filters]);

  /* ── Mutations ── */
  const toggleActiveMutation = useMutation({
    mutationFn: async (p: { id: number; isActive: boolean }) =>
      api.patch(`/users/${p.id}/active`, { isActive: p.isActive }),
    onSuccess: async () => {
      toast.success("Durum güncellendi.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: unknown) =>
      toast.error(resolveApiErrorMessage(err, "Durum güncellenemedi.")),
  });

  const bulkRoleMutation = useMutation({
    mutationFn: async (p: { ids: number[]; role: UserRole; reason?: string }) =>
      Promise.all(p.ids.map((id) => updateUserRole(id, p.role, p.reason))),
    onSuccess: async () => {
      toast.success("Roller güncellendi.");
      setSelectedKeys(new Set());
      setBulkRoleReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: unknown) =>
      toast.error(resolveApiErrorMessage(err, "Toplu rol güncellenemedi.")),
  });

  /* ── Columns ── */
  const columns: DataTableColumn<UserRow>[] = [
    {
      key: "name",
      label: "Kullanıcı",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[var(--neutral-100)] flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-[var(--neutral-600)]">
              {row.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-[var(--primary-800)] leading-tight">
              {row.name}
            </p>
            <p className="text-[11px] text-[var(--neutral-500)]">
              {row.email ?? row.phone ?? `#${row.id}`}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Rol",
      sortable: true,
      render: (row) => (
        <StatusBadge
          variant={roleVariant[toSystemRole(row.role)] ?? "neutral"}
          dot
        >
          {roleLabel[toSystemRole(row.role)] ?? toSystemRole(row.role)}
        </StatusBadge>
      ),
    },
    {
      key: "isActive",
      label: "Durum",
      render: (row) => (
        <StatusBadge
          variant={
            row.deletedAt ? "error" : row.isActive ? "success" : "neutral"
          }
        >
          {row.deletedAt ? "Silinmiş" : row.isActive ? "Aktif" : "Pasif"}
        </StatusBadge>
      ),
    },
    {
      key: "createdAt",
      label: "Kayıt Tarihi",
      sortable: true,
      render: (row) => (
        <span className="text-[var(--neutral-600)]">
          {new Date(row.createdAt).toLocaleDateString("tr-TR")}
        </span>
      ),
    },
    {
      key: "lastLoginAt",
      label: "Son Giriş",
      sortable: true,
      render: (row) => (
        <span className="text-[var(--neutral-500)]">
          {row.lastLoginAt
            ? new Date(row.lastLoginAt).toLocaleDateString("tr-TR")
            : "—"}
        </span>
      ),
    },
  ];

  /* ── Row Actions ── */
  const renderRowActions = (row: UserRow) => (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={toggleActiveMutation.isPending}
        onClick={() =>
          toggleActiveMutation.mutate({ id: row.id, isActive: !row.isActive })
        }
        className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
          row.isActive
            ? "text-amber-700 hover:bg-amber-50"
            : "text-emerald-700 hover:bg-emerald-50"
        }`}
      >
        {row.isActive ? "Pasife Al" : "Aktifleştir"}
      </button>
    </div>
  );

  /* ── Toolbar ── */
  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <FilterPanel fields={filterFields} values={filters} onChange={setFilters}>
        {selectedKeys.size > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5">
            <span className="text-xs font-semibold text-blue-700">
              {selectedKeys.size} seçili
            </span>
            {requiresRoleOverride ? (
              <input
                value={bulkRoleReason}
                onChange={(e) => setBulkRoleReason(e.target.value)}
                placeholder="Rol değişikliği nedeni"
                className="h-7 rounded-md border border-blue-200 bg-white px-2 text-[11px] text-blue-700"
              />
            ) : null}
            <select
              onChange={(e) => {
                if (!e.target.value) return;
                bulkRoleMutation.mutate({
                  ids: Array.from(selectedKeys) as number[],
                  role: e.target.value as UserRole,
                  reason: bulkRoleReason,
                });
                e.target.value = "";
              }}
              className="h-7 rounded-md border border-blue-200 bg-white px-2 text-[11px] text-blue-700"
            >
              <option value="">Rol Değiştir...</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabel[r]}
                </option>
              ))}
            </select>
          </div>
        )}
      </FilterPanel>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--primary-800)]">
            Kullanıcı Yönetimi
          </h1>
          <p className="mt-1 text-sm text-[var(--neutral-600)]">
            Kayıtlı kullanıcıları görüntüleyin, rol ve durumlarını yönetin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-800)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-700)]"
          >
            <UserPlus className="h-4 w-4" />
            Yeni Kullanıcı
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Toplam", value: users?.length ?? 0, icon: Shield },
          {
            label: "Aktif",
            value: users?.filter((u) => u.isActive && !u.deletedAt).length ?? 0,
            icon: ShieldCheck,
          },
          {
            label: "Pasif",
            value: users?.filter((u) => !u.isActive).length ?? 0,
            icon: AlertTriangle,
          },
          {
            label: "Admin",
            value:
              users?.filter((u) =>
                ["SUPER_ADMIN", "ADMIN"].includes(toSystemRole(u.role)),
              ).length ?? 0,
            icon: ShieldCheck,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-[var(--neutral-200)] bg-white px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <s.icon className="h-4 w-4 text-[var(--neutral-400)]" />
              <span className="text-xs font-medium text-[var(--neutral-500)]">
                {s.label}
              </span>
            </div>
            <p className="mt-1 text-xl font-bold text-[var(--primary-800)]">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Error State ── */}
      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" /> Kullanıcılar alınamadı.
        </div>
      )}

      {/* ── Table ── */}
      <DataTable<UserRow>
        columns={columns}
        data={filteredUsers}
        keyExtractor={(row) => row.id}
        loading={isLoading}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
        rowActions={(row) => renderRowActions(row)}
        toolbar={toolbar}
        emptyMessage="Kriterlere uygun kullanıcı bulunamadı."
      />

      {/* ── Create User Modal ── */}
      {showCreateModal && (
        <CreateUserModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

/* ── Create User Modal ── */
function CreateUserModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    role: "SELLER_STAFF" as UserRole,
    password: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => api.post("/users", formData),
    onSuccess: async () => {
      toast.success("Kullanıcı oluşturuldu.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      onClose();
    },
    onError: (err: unknown) =>
      toast.error(resolveApiErrorMessage(err, "Kullanıcı oluşturulamadı.")),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--neutral-200)] bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[var(--primary-800)]">
            Yeni Kullanıcı
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--neutral-500)] hover:bg-[var(--neutral-100)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          {[
            { key: "name", label: "Ad Soyad", type: "text", required: true },
            { key: "phone", label: "Telefon", type: "text", required: true },
            { key: "email", label: "E-posta", type: "email", required: false },
            {
              key: "password",
              label: "Şifre",
              type: "password",
              required: true,
            },
          ].map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">
                {f.label}
              </label>
              <input
                type={f.type}
                required={f.required}
                value={formData[f.key as keyof typeof formData]}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, [f.key]: e.target.value }))
                }
                className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)] focus:ring-1 focus:ring-[var(--primary-200)]"
              />
            </div>
          ))}

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--neutral-600)]">
              Rol
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData((p) => ({ ...p, role: e.target.value as UserRole }))
              }
              className="w-full rounded-lg border border-[var(--neutral-200)] px-3 py-2 text-sm outline-none focus:border-[var(--primary-400)] focus:ring-1 focus:ring-[var(--primary-200)]"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabel[r]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--neutral-200)] px-4 py-2 text-sm font-medium text-[var(--neutral-700)] hover:bg-[var(--neutral-100)]"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-[var(--primary-800)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-700)] disabled:opacity-50"
            >
              {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
