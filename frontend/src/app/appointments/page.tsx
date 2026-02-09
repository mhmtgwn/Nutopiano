'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/common/Button';
import { useAppSelector } from '@/store';
import { getAuthToken } from '@/utils/helpers';

export default function AppointmentsPage() {
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
          Randevu Yönetimi
        </h1>
        <p className="text-xs text-[#5C5C5C] md:text-sm">
          Randevu takvimi, müşteri kayıtları ve hatırlatma akışı bu bölümde
          yönetilecek.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-[#E5E5E0] bg-white px-4 py-6 md:px-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#1A3C34]/60">
          <span>Yakında</span>
          <span className="h-1 w-1 rounded-full bg-[#C5A059]"></span>
          <span>Randevu</span>
        </div>
        <p className="text-sm text-[#5C5C5C] md:text-base">
          Takvim planlama, personel uygunluğu ve müşteri hatırlatmaları için
          merkezi yönetim ekranı.
        </p>

        {isAuthed ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#E5E5E0] bg-[#FFF9E6] px-4 py-3 text-sm text-[#1A3C34]">
              Takvim görünümü ve hızlı randevu oluşturma
            </div>
            <div className="rounded-xl border border-[#E5E5E0] bg-[#F3FAF5] px-4 py-3 text-sm text-[#1A3C34]">
              Personel bazlı uygunluk ve hizmet süresi yönetimi
            </div>
            <div className="rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-sm text-[#1A3C34]">
              Otomatik SMS/e-posta hatırlatmaları
            </div>
            <div className="rounded-xl border border-[#E5E5E0] bg-white px-4 py-3 text-sm text-[#1A3C34]">
              Müşteri geçmişi ve tekrar randevu akışı
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E5E5E0] bg-[#FFF9E6] px-4 py-4">
            <p className="text-sm text-[#1A3C34]">
              Randevu ekranları yalnızca yönetim hesabıyla erişilebilir. Devam
              etmek için giriş yapın.
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
