'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Archive, LayoutGrid, Pencil, Save, X, ChevronRight } from 'lucide-react';
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

interface CategoryTreeNode {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  isActive: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  children?: CategoryTreeNode[];
}

interface FlatCategory {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  isActive: boolean;
  orderIndex: number;
  level: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  isActive: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface PaginatedCategories {
  data: CategoryRow[];
  meta: PaginationMeta;
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    parentId: '',
    orderIndex: '0',
    isActive: true,
  });

  const {
    data: categoriesPayload,
    isLoading: isListLoading,
    isError: isListError,
  } = useQuery<PaginatedCategories>({
    queryKey: ['admin-categories', { page, pageSize }],
    queryFn: async () => {
      const res = await api.get<PaginatedCategories>('/categories', {
        params: {
          page,
          pageSize,
        },
      });
      return res.data;
    },
  });

  const categories = categoriesPayload?.data ?? [];
  const meta = categoriesPayload?.meta;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    parentId: '',
    orderIndex: '0',
    isActive: true,
  });

  const {
    data: categoriesTree,
    isLoading,
    isError,
  } = useQuery<CategoryTreeNode[]>({
    queryKey: ['admin-categories-tree'],
    queryFn: async () => {
      const res = await api.get<CategoryTreeNode[]>('/categories/tree');
      return res.data;
    },
  });

  // Flatten tree for table display
  const flattenCategories = (tree: CategoryTreeNode[], level = 0): FlatCategory[] => {
    const result: FlatCategory[] = [];
    for (const cat of tree) {
      result.push({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parentId: cat.parentId,
        isActive: cat.isActive,
        orderIndex: cat.orderIndex,
        level,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
        archivedAt: cat.archivedAt,
      });
      if (cat.children) {
        result.push(...flattenCategories(cat.children, level + 1));
      }
    }
    return result;
  };

  const flatCategories = useMemo(() => {
    return flattenCategories(categoriesTree || []);
  }, [categoriesTree]);

  const categoryById = useMemo(() => {
    const map = new Map<number, FlatCategory>();
    for (const c of flatCategories) {
      map.set(c.id, c);
    }
    return map;
  }, [flatCategories]);

  // For parent selectors, create list excluding current category if editing
  const availableParents = useMemo(() => {
    const categories = flatCategories.filter(
      (cat) => editingId === null || cat.id !== editingId
    );
    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      level: cat.level,
    }));
  }, [flatCategories, editingId]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const orderIndex = Number(createForm.orderIndex);
      const parentId = createForm.parentId ? Number(createForm.parentId) : undefined;
      
      if (!createForm.name.trim()) {
        throw new Error('Kategori adı zorunludur.');
      }
      if (Number.isNaN(orderIndex) || orderIndex < 0) {
        throw new Error('Sıra değeri geçersiz.');
      }
      if (parentId !== undefined && (Number.isNaN(parentId) || parentId < 1)) {
        throw new Error('Üst kategori seçimi geçersiz.');
      }

      await api.post('/categories', {
        name: createForm.name.trim(),
        slug: createForm.slug.trim() || undefined,
        parentId,
        isActive: createForm.isActive,
        orderIndex,
      });
    },
    onSuccess: async () => {
      toast.success('Kategori oluşturuldu.');
      setCreateForm({ name: '', slug: '', parentId: '', orderIndex: '0', isActive: true });
      await queryClient.invalidateQueries({ queryKey: ['admin-categories-tree'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (error: unknown) => {
      toast.error(resolveApiErrorMessage(error, 'Kategori oluşturulamadı.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const orderIndex = Number(editForm.orderIndex);
      const parentId = editForm.parentId ? Number(editForm.parentId) : null;
      
      if (!editForm.name.trim()) {
        throw new Error('Kategori adı zorunludur.');
      }
      if (Number.isNaN(orderIndex) || orderIndex < 0) {
        throw new Error('Sıra değeri geçersiz.');
      }
      if (parentId !== null && (Number.isNaN(parentId) || parentId < 1)) {
        throw new Error('Üst kategori seçimi geçersiz.');
      }

      await api.patch(`/categories/${categoryId}`, {
        name: editForm.name.trim(),
        slug: editForm.slug.trim() || undefined,
        parentId: parentId || undefined,
        isActive: editForm.isActive,
        orderIndex,
      });
    },
    onSuccess: async () => {
      toast.success('Kategori güncellendi.');
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-categories-tree'] });
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
      await queryClient.invalidateQueries({ queryKey: ['admin-categories-tree'] });
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
      parentId: category.parentId ? String(category.parentId) : '',
      orderIndex: String(category.orderIndex ?? 0),
      isActive: category.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', slug: '', parentId: '', orderIndex: '0', isActive: true });
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
            Toplam: {meta?.total ?? flatCategories?.length ?? 0}
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

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#AC9C7A]">
                Üst Kategori (opsiyonel)
              </label>
              <select
                value={createForm.parentId}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, parentId: e.target.value }))
                }
                className="h-11 w-full rounded-2xl border border-[#E5E5E0] bg-white px-3 text-sm text-[#1A3C34] shadow-sm outline-none focus-visible:border-[#1A3C34] focus-visible:ring-2 focus-visible:ring-[#C5A059]/20"
              >
                <option value="">Kök kategori (üst yok)</option>
                {availableParents.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {'  '.repeat(cat.level)}
                    {cat.name}
                  </option>
                ))}
              </select>
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
            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.6fr)_minmax(0,1fr)] gap-3 border-b border-[#E5E5E0] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]/60">
              <span>Kategori</span>
              <span>Slug</span>
              <span>Sıra</span>
              <span>Üst Kat.</span>
              <span>Durum</span>
              <span className="text-right">Aksiyon</span>
            </div>
            <div className="divide-y divide-[#F0F0EA]">
              {(isLoading || isListLoading) && (
                <div className="px-4 py-8">
                  <Spinner fullscreen />
                </div>
              )}

              {(isError || isListError) && !(isLoading || isListLoading) && (
                <div className="px-4 py-4 text-sm text-red-700">
                  Kategoriler yüklenemedi.
                </div>
              )}

              {!(isLoading || isListLoading) && !(isError || isListError) && (!categories || categories.length === 0) && (
                <div className="px-4 py-4 text-sm text-[#5C5C5C]">
                  Kategori bulunamadı.
                </div>
              )}

              {!(isLoading || isListLoading) && !(isError || isListError) && categories?.map((c) => {
                const isEditing = editingId === c.id;
                const flat = categoryById.get(c.id);
                const level = flat?.level ?? 0;
                return (
                  <div
                    key={c.id}
                    className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.6fr)_minmax(0,1fr)] gap-3 px-4 py-3 text-sm text-[#1A3C34]"
                  >
                    <div className="min-w-0">
                      {!isEditing ? (
                        <div>
                          <p className="truncate font-semibold" style={{ paddingLeft: `${level * 12}px` }}>
                            {level > 0 && (
                              <ChevronRight className="inline h-3 w-3 mr-1" />
                            )}
                            {c.name}
                          </p>
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
                        <span className="text-sm text-[#5C5C5C]">
                          {c.parentId ? categoryById.get(c.parentId)?.name || '-' : '-'}
                        </span>
                      ) : (
                        <select
                          value={editForm.parentId}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              parentId: e.target.value,
                            }))
                          }
                          className="h-9 w-full rounded-xl border border-[#E5E5E0] bg-white px-2 text-xs outline-none"
                        >
                          <option value="">Kök</option>
                          {availableParents.map((cat) => (
                            <option key={cat.id} value={String(cat.id)}>
                              {'  '.repeat(cat.level)}
                              {cat.name}
                            </option>
                          ))}
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

          {!(isLoading || isListLoading) && !(isError || isListError) && meta && meta.totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E5E0] pt-4 text-xs text-[#5C5C5C]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#1A3C34]/60">
                Sayfa {meta.page} / {meta.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={meta.page <= 1}
                  className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[#E5E5E0] bg-white px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#1A3C34] shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Önceki
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={meta.page >= meta.totalPages}
                  className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[#1A3C34]/10 bg-[#1A3C34] px-4 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
