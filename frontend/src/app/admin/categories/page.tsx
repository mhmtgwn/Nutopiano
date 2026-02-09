'use client';

import { FormEvent, useState } from 'react';
import { Archive, LayoutGrid, Pencil, Save, X } from 'lucide-react';
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

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();

  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    orderIndex: '0',
    isActive: true,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    orderIndex: '0',
    isActive: true,
  });

  const {
    data: categories,
    isLoading,
    isError,
  } = useQuery<CategoryRow[]>({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res = await api.get<CategoryRow[]>('/categories');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const orderIndex = Number(createForm.orderIndex);
      if (!createForm.name.trim()) {
        throw new Error('Kategori adı zorunludur.');
      }
      if (Number.isNaN(orderIndex) || orderIndex < 0) {
        throw new Error('Sıra değeri geçersiz.');
      }
      await api.post('/categories', {
        name: createForm.name.trim(),
        slug: createForm.slug.trim() || undefined,
        isActive: createForm.isActive,
        orderIndex,
      });
    },
    onSuccess: async () => {
      toast.success('Kategori oluşturuldu.');
      setCreateForm({ name: '', slug: '', orderIndex: '0', isActive: true });
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Kategori oluşturulamadı.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const orderIndex = Number(editForm.orderIndex);
      if (!editForm.name.trim()) {
        throw new Error('Kategori adı zorunludur.');
      }
      if (Number.isNaN(orderIndex) || orderIndex < 0) {
        throw new Error('Sıra değeri geçersiz.');
      }

      await api.patch(`/categories/${categoryId}`, {
        name: editForm.name.trim(),
        slug: editForm.slug.trim() || undefined,
        isActive: editForm.isActive,
        orderIndex,
      });
    },
    onSuccess: async () => {
      toast.success('Kategori güncellendi.');
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Kategori güncellenemedi.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      await api.delete(`/categories/${categoryId}`);
    },
    onSuccess: async () => {
      toast.success('Kategori arşivlendi.');
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Kategori arşivlenemedi.'));
    },
  });

  const beginEdit = (category: CategoryRow) => {
    setEditingId(category.id);
    setEditForm({
      name: category.name,
      slug: category.slug,
      orderIndex: String(category.orderIndex ?? 0),
      isActive: category.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', slug: '', orderIndex: '0', isActive: true });
  };

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#1A3C34]/10 bg-white/90 px-6 py-6 shadow-[0_30px_90px_rgba(26,60,52,0.12)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Katalog
            </p>
            <h1 className="text-3xl font-serif text-[#1A3C34] md:text-4xl">
              Kategori yönetimi
            </h1>
            <p className="text-sm text-[#5C5C5C]">
              Gerçek kategori CRUD akışı (ADMIN yetkisi ile) backend tarafına bağlıdır.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/10 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]/70">
            <LayoutGrid className="h-4 w-4" />
            Toplam: {categories?.length ?? 0}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-[28px] border border-[#E0D7C6] bg-white/90 px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Yeni kategori
            </p>
            <h2 className="mt-2 text-2xl font-serif text-[#1A3C34]">
              Koleksiyon oluştur
            </h2>
          </div>

          <div className="grid gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Ad
              </label>
              <input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, name: e.target.value }))
                }
                className="h-11 w-full rounded-2xl border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-2 focus-visible:ring-[#C5A059]/20"
                placeholder="örn: Piyanolar"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Slug (opsiyonel)
              </label>
              <input
                value={createForm.slug}
                onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))}
                className="h-11 w-full rounded-2xl border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-2 focus-visible:ring-[#C5A059]/20"
                placeholder="örn: piyanolar"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                  Sıra
                </label>
                <input
                  value={createForm.orderIndex}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      orderIndex: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-2 focus-visible:ring-[#C5A059]/20"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                  Durum
                </label>
                <select
                  value={createForm.isActive ? 'active' : 'inactive'}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      isActive: e.target.value === 'active',
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-2 focus-visible:ring-[#C5A059]/20"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={createMutation.isPending}
            isLoading={createMutation.isPending}
          >
            Kategoriyi kaydet
          </Button>
        </form>

        <section className="rounded-[28px] border border-[#E0D7C6] bg-white/90 px-6 py-6 shadow-[0_20px_60px_rgba(26,60,52,0.08)]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
              Liste
            </p>
            <h2 className="mt-2 text-2xl font-serif text-[#1A3C34]">
              Kategoriler
            </h2>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-[#1A3C34]/10 bg-white">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.9fr)] gap-3 border-b border-[#E5E5E0] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]/60">
              <span>Kategori</span>
              <span>Slug</span>
              <span>Sıra</span>
              <span>Durum</span>
              <span className="text-right">Aksiyon</span>
            </div>
            <div className="divide-y divide-[#F0F0EA]">
              {isLoading && (
                <div className="px-4 py-8">
                  <Spinner fullscreen />
                </div>
              )}

              {isError && !isLoading && (
                <div className="px-4 py-4 text-sm text-red-700">
                  Kategoriler yüklenemedi.
                </div>
              )}

              {!isLoading && !isError && (!categories || categories.length === 0) && (
                <div className="px-4 py-4 text-sm text-[#5C5C5C]">
                  Kategori bulunamadı.
                </div>
              )}

              {!isLoading && !isError && categories?.map((c) => {
                const isEditing = editingId === c.id;
                return (
                  <div
                    key={c.id}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.9fr)] gap-3 px-4 py-3 text-sm text-[#1A3C34]"
                  >
                    <div className="min-w-0">
                      {!isEditing ? (
                        <div>
                          <p className="truncate font-semibold">{c.name}</p>
                          <p className="truncate text-xs text-[#5C5C5C]">ID: {c.id}</p>
                        </div>
                      ) : (
                        <input
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, name: e.target.value }))
                          }
                          className="h-9 w-full rounded-xl border border-[#E5E5E0] bg-white px-3 text-sm outline-none"
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      {!isEditing ? (
                        <span className="truncate text-sm text-[#5C5C5C]">{c.slug}</span>
                      ) : (
                        <input
                          value={editForm.slug}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              slug: e.target.value,
                            }))
                          }
                          className="h-9 w-full rounded-xl border border-[#E5E5E0] bg-white px-3 text-xs outline-none"
                        />
                      )}
                    </div>

                    <div>
                      {!isEditing ? (
                        <span className="text-sm text-[#5C5C5C]">{c.orderIndex}</span>
                      ) : (
                        <input
                          value={editForm.orderIndex}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              orderIndex: e.target.value,
                            }))
                          }
                          className="h-9 w-full rounded-xl border border-[#E5E5E0] bg-white px-3 text-xs outline-none"
                          inputMode="numeric"
                        />
                      )}
                    </div>

                    <div>
                      {!isEditing ? (
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                            c.isActive
                              ? 'bg-[#F3EEE3] text-[#3E2723]'
                              : 'bg-[#3E2723] text-white'
                          }`}
                        >
                          {c.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      ) : (
                        <select
                          value={editForm.isActive ? 'active' : 'inactive'}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              isActive: e.target.value === 'active',
                            }))
                          }
                          className="h-9 w-full rounded-xl border border-[#E5E5E0] bg-white px-2 text-xs outline-none"
                        >
                          <option value="active">Aktif</option>
                          <option value="inactive">Pasif</option>
                        </select>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      {!isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => beginEdit(c)}
                            className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/15 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]"
                          >
                            <Pencil className="h-4 w-4" />
                            Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(c.id)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-full border border-[#B04B4B]/30 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#B04B4B] disabled:opacity-60"
                          >
                            <Archive className="h-4 w-4" />
                            Arşivle
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => editingId && updateMutation.mutate(editingId)}
                            disabled={updateMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-full bg-[#1A3C34] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white disabled:opacity-60"
                          >
                            <Save className="h-4 w-4" />
                            Kaydet
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="inline-flex items-center gap-2 rounded-full border border-[#1A3C34]/15 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]"
                          >
                            <X className="h-4 w-4" />
                            İptal
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
