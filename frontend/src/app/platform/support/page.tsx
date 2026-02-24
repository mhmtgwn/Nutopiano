'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, ShieldAlert, UserRoundSearch } from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import Button from '@/components/common/Button';
import { useCapabilities } from '@/hooks/useCapabilities';
import api from '@/services/api';

type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type SellerRow = {
  id: number;
  userId: number;
  slug: string;
  displayName: string;
  isActive: boolean;
};

type PaginatedSellers = {
  data: SellerRow[];
  meta: PaginationMeta;
};

const maskPhone = (value?: string | null) => {
  const v = String(value ?? '');
  if (v.length < 6) return '***';
  return `${v.slice(0, 3)}***${v.slice(-2)}`;
};

export default function PlatformSupportModePage() {
  const { can } = useCapabilities();
  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [piiMaskingEnabled, setPiiMaskingEnabled] = useState(true);
  const [supportSessionEndsAt, setSupportSessionEndsAt] = useState<string | null>(
    null,
  );

  const { data, isLoading, isError } = useQuery<PaginatedSellers>({
    queryKey: ['platform-support-sellers'],
    queryFn: async () => {
      const res = await api.get<PaginatedSellers>(
        '/platform/sellers?isActive=true&page=1&pageSize=50',
      );
      return res.data;
    },
  });

  const sellers = data?.data ?? [];
  const selectedSeller = useMemo(
    () => sellers.find((row) => row.id === selectedSellerId) ?? null,
    [selectedSellerId, sellers],
  );

  if (!can('VIEW_SUPPORT_MODE')) {
    return (
      <section className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 px-6 py-6">
        <p className="text-sm text-red-700">
          Support Mode ekranini goruntulemek icin yetkiniz yok.
        </p>
      </section>
    );
  }

  const startSupportSession = () => {
    if (!selectedSeller) return;
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    setSupportSessionEndsAt(expires.toISOString());
  };

  const clearSession = () => {
    setSupportSessionEndsAt(null);
    setSelectedSellerId(null);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-gradient-to-br from-[#FFF7EE] via-white to-[#ECF5FF] px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--neutral-500)]">
          Platform
        </p>
        <h1 className="mt-2 text-3xl font-serif text-[var(--primary-800)]">Support Mode</h1>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">
          View-as seller akışını güvenli şekilde yönetmek için hazırlanan operasyon paneli.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <h2 className="text-xl font-serif text-[var(--primary-800)]">Session Control</h2>
          <div className="mt-4 space-y-3 text-sm text-[var(--neutral-700)]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={piiMaskingEnabled}
                onChange={(event) => setPiiMaskingEnabled(event.target.checked)}
              />
              PII masking etkin (önerilen)
            </label>

            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Not: Session impersonation başlatıldığında audit log zorunlu olmalıdır. Mevcut sürümde bu ekran UI hazırlığıdır.
            </p>
          </div>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
          <h2 className="text-xl font-serif text-[var(--primary-800)]">Aktif Support Session</h2>
          {!supportSessionEndsAt ? (
            <p className="mt-3 text-sm text-[var(--neutral-600)]">Aktif oturum yok.</p>
          ) : (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <p>
                View-as: {selectedSeller?.displayName} (#{selectedSeller?.id})
              </p>
              <p>Süre sonu: {new Date(supportSessionEndsAt).toLocaleString('tr-TR')}</p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 h-8 px-3 text-xs"
                onClick={clearSession}
              >
                Session Sonlandır
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[var(--radius-xl)] border border-[var(--neutral-200)] bg-white px-6 py-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-serif text-[var(--primary-800)]">Seller List</h2>
          <span className="text-xs text-[var(--neutral-600)]">
            Seçili: {selectedSeller ? `${selectedSeller.displayName} (#${selectedSeller.id})` : '-'}
          </span>
        </div>

        {isLoading ? (
          <div className="mt-4">
            <Spinner label="Seller listesi yükleniyor..." />
          </div>
        ) : null}

        {isError ? (
          <p className="mt-4 text-sm text-red-700">Seller listesi yüklenemedi.</p>
        ) : null}

        {!isLoading && !isError ? (
          <div className="mt-4 grid gap-2">
            {sellers.map((seller) => (
              <button
                key={seller.id}
                type="button"
                onClick={() => setSelectedSellerId(seller.id)}
                className={`rounded-lg border px-4 py-3 text-left text-sm ${
                  selectedSellerId === seller.id
                    ? 'border-[var(--primary-800)] bg-[var(--neutral-50)]'
                    : 'border-[var(--neutral-200)] bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-[var(--primary-800)]">{seller.displayName}</p>
                  <span className="text-xs text-[var(--neutral-600)]">#{seller.id}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--neutral-600)]">
                  Slug: {seller.slug} · User: {seller.userId}
                </p>
                <p className="mt-1 text-xs text-[var(--neutral-600)]">
                  Masked contact: {piiMaskingEnabled ? maskPhone(String(seller.userId)) : String(seller.userId)}
                </p>
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={startSupportSession}
            disabled={!selectedSeller}
            leftIcon={<UserRoundSearch className="h-4 w-4" />}
          >
            View-as Başlat
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!selectedSeller}
            leftIcon={<Eye className="h-4 w-4" />}
          >
            Read-only Önizleme
          </Button>
          <Button
            type="button"
            variant="secondary"
            leftIcon={<ShieldAlert className="h-4 w-4" />}
          >
            Audit Gereksinimleri
          </Button>
        </div>
      </section>
    </div>
  );
}
