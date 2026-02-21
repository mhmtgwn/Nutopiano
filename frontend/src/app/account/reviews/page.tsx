'use client';

import Link from 'next/link';
import toast from 'react-hot-toast';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import { formatDate } from '@/utils/helpers';

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

type CustomerReviewRow = {
  id: number;
  productId: number;
  rating: number;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AccountReviewsPage() {
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerReviewRow | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const { data, isLoading, isError, error } = useQuery<CustomerReviewRow[]>({
    queryKey: ['account-reviews'],
    queryFn: async () => {
      const res = await api.get<CustomerReviewRow[]>('/customer/reviews');
      return res.data;
    },
  });

  const openEdit = (row: CustomerReviewRow) => {
    setEditing(row);
    setRating(row.rating);
    setComment(row.comment ?? '');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
  };

  const upsertMutation = useMutation({
    mutationFn: async (payload: { productId: number; rating: number; comment?: string }) => {
      const res = await api.post<CustomerReviewRow>('/customer/reviews', payload);
      return res.data;
    },
    onSuccess: async () => {
      toast.success('Yorum kaydedildi.');
      closeForm();
      await queryClient.invalidateQueries({ queryKey: ['account-reviews'] });
    },
    onError: (err: unknown) => {
      toast.error(resolveApiErrorMessage(err, 'Yorum kaydedilemedi.'));
    },
  });

  const reviews = data ?? [];

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-6 md:px-6 md:py-10">
        <Spinner fullscreen />
      </div>
    );
  }

  if (isError) {
    const message = resolveApiErrorMessage(error, 'Yorumlar yüklenemedi.');
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:px-6 md:py-10">
        <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">Yorumlarım</h1>
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
          <h1 className="text-2xl font-semibold text-[var(--primary-800)] md:text-3xl">Yorumlarım</h1>
          <p className="mt-1 text-xs text-[var(--neutral-600)] md:text-sm">
            Yazdığınız ürün yorumlarını buradan güncelleyebilirsiniz.
          </p>
        </div>
      </header>

      {reviews.length === 0 ? (
        <section className="space-y-3 rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-6 shadow-[var(--shadow-md)] md:px-6">
          <p className="text-sm text-[var(--neutral-600)] md:text-base">Henüz yorum yok.</p>
          <Button type="button" variant="secondary" onClick={() => (window.location.href = '/products')}>
            Ürünlere git
          </Button>
        </section>
      ) : (
        <section className="grid gap-3">
          {reviews.map((row) => (
            <div
              key={row.id}
              className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white px-4 py-5 shadow-[var(--shadow-md)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--primary-800)]">Ürün #{row.productId}</p>
                  <p className="mt-1 text-xs text-[var(--neutral-500)]">
                    {formatDate(row.createdAt)}
                    {row.updatedAt && row.updatedAt !== row.createdAt ? ` • güncellendi: ${formatDate(row.updatedAt)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-1 text-xs font-semibold text-[var(--primary-800)]">
                    {row.rating}/5
                  </span>
                  <Button type="button" variant="secondary" onClick={() => openEdit(row)}>
                    Düzenle
                  </Button>
                </div>
              </div>
              {row.comment && (
                <p className="mt-3 text-sm text-[var(--neutral-700)]">{row.comment}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {isFormOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
          <div className="w-full max-w-xl rounded-[var(--radius-2xl)] bg-white p-5 shadow-[var(--shadow-2xl)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Yorum düzenle
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--primary-800)]">Ürün #{editing.productId}</p>
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

            <div className="mt-4 grid gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Puan (1-5)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="h-11 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 text-sm outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
                  Yorum
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[110px] w-full rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-white px-4 py-3 text-sm outline-none"
                  placeholder="Deneyiminizi yazın..."
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeForm}>
                Vazgeç
              </Button>
              <Button
                type="button"
                onClick={() =>
                  upsertMutation.mutate({
                    productId: editing.productId,
                    rating,
                    comment: comment.trim() || undefined,
                  })
                }
                isLoading={upsertMutation.isPending}
                disabled={upsertMutation.isPending}
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
