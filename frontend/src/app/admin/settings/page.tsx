'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowUpRight, FileText, Globe, Palette, Settings } from 'lucide-react';

import api from '@/services/api';

const cards = [
  {
    title: 'Site ayarları',
    description: 'Firma adı, iletişim bilgileri ve temel parametreler.',
    icon: Settings,
  },
  {
    title: 'Yasal metinler',
    description: 'KVKK, mesafeli satış ve gizlilik metinlerini düzenleyin.',
    icon: FileText,
  },
  {
    title: 'Marka görünümü',
    description: 'Logo, renk paleti ve görsel ayarları güncelleyin.',
    icon: Palette,
  },
  {
    title: 'SEO ayarları',
    description: 'Canonical, OG ve arama motoru yapılandırmaları.',
    icon: Globe,
  },
];

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const key = 'moderation_enabled';

  const {
    data: setting,
    isLoading,
    isError,
  } = useQuery<{ id: number; key: string; value: unknown } | null>({
    queryKey: ['settings', key],
    queryFn: async () => {
      try {
        const res = await api.get<{ id: number; key: string; value: unknown }>(`/settings/${key}`);
        return res.data;
      } catch {
        return null;
      }
    },
  });

  const moderationEnabled = Boolean((setting?.value as any) ?? false);

  const updateModerationMutation = useMutation({
    mutationFn: async (nextValue: boolean) => {
      await api.post(`/settings/${key}`, { value: nextValue });
    },
    onError: () => {
      toast.error('Ayar güncellenemedi.');
    },
    onSuccess: async () => {
      toast.success('Ayar güncellendi.');
      await queryClient.invalidateQueries({ queryKey: ['settings', key] });
    },
  });

  return (
    <div className="space-y-6">
      <section className="border-b border-[var(--neutral-200)] pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
              Ayarlar
            </p>
            <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)] md:text-4xl">
              Genel ayarlar
            </h1>
            <p className="mt-2 text-sm text-[var(--neutral-600)]">
              Site genel ayarları, yasal metinler ve marka görünümü.
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--neutral-200)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--primary-800)] transition hover:bg-[var(--neutral-50)]"
          >
            Kaydet <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--neutral-500)]">
          Moderasyon
        </p>
        <h2 className="mt-2 text-2xl font-serif text-[var(--primary-800)]">Ürün moderasyonu</h2>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">
          Faz 1 kararı: başlangıçta kapalı. Açıldığında marketplace ürünleri moderasyon akışına alınır.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[var(--neutral-600)]">
            Durum:{' '}
            <span className="font-semibold text-[var(--primary-800)]">
              {moderationEnabled ? 'Açık' : 'Kapalı'}
            </span>
          </div>
          <button
            type="button"
            disabled={isLoading || updateModerationMutation.isPending}
            onClick={() => updateModerationMutation.mutate(!moderationEnabled)}
            className={`inline-flex h-11 items-center justify-center rounded-full border px-6 text-[11px] font-semibold uppercase tracking-[0.25em] transition disabled:opacity-60 ${
              moderationEnabled
                ? 'border-[var(--neutral-200)] bg-white text-[var(--primary-800)] hover:bg-[var(--neutral-50)]'
                : 'border-[var(--primary-800)] bg-[var(--primary-800)] text-white hover:opacity-95'
            }`}
          >
            {moderationEnabled ? 'Kapat' : 'Aç'}
          </button>
        </div>

        {isError && (
          <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-3 text-sm text-[var(--neutral-600)]">
            Ayar okunamadı.
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6"
            >
              <Icon className="h-5 w-5 text-[var(--primary-800)]/70" />
              <h2 className="mt-4 text-2xl font-serif text-[var(--primary-800)]">
                {card.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--neutral-600)]">{card.description}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
