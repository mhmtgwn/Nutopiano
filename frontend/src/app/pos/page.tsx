'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/common/Button';
import { useAppSelector } from '@/store';
import { getAuthToken } from '@/utils/helpers';

export default function PosPage() {
  const router = useRouter();
  const user = useAppSelector((state) => state.user.user);
  const hasToken = !!getAuthToken();
  const isAuthed = !!user || hasToken;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C5A059]">
          Yönetim Modülü
        </p>
        <h1 className="text-2xl font-semibold text-[#1A3C34] md:text-3xl">
          POS Yönetimi
        </h1>
        <p className="text-xs text-[#5C5C5C] md:text-sm">
          Market POS akışı için kasa yönetimi, hızlı satış ve güncel stok ekranı bu
          alanda toplanacak.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-[#E5E5E0] bg-white px-4 py-6 md:px-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#1A3C34]/60">
          <span>Yakında</span>
          <span className="h-1 w-1 rounded-full bg-[#C5A059]"></span>
          <span>POS</span>
        </div>
        <p className="text-sm text-[#5C5C5C] md:text-base">
          Bu ekran ileride kasiyer iş akışlarını, ürün aramayı ve ödemeyi tek
          noktadan yönetmek için kullanılacak.
        </p>

        {isAuthed ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#E5E5E0] bg-[#FFF9E6] px-4 py-3 text-sm text-[#1A3C34]">
              Hızlı ürün arama ve barkod ile satış
            </div>
            <div className="rounded-xl border border-[#E5E5E0] bg-[#F3FAF5] px-4 py-3 text-sm text-[#1A3C34]">
              Anlık stok ve kasa kapanış raporu
            </div>
            <div className="rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-sm text-[#1A3C34]">
              Farklı ödeme yöntemleri ve split ödeme
            </div>
            <div className="rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-sm text-[#1A3C34]">
              Satış sırasında müşteri profiline hızlı erişim
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E5E5E0] bg-[#FFF9E6] px-4 py-4">
            <p className="text-sm text-[#1A3C34]">
              POS ekranları yalnızca yönetim hesabıyla erişilebilir. Devam etmek
              için giriş yapın.
            </p>
            <Button className="mt-3 w-fit" onClick={() => router.push('/login')}>
              Giriş yap
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
