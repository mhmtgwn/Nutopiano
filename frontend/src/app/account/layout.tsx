import type { Metadata } from 'next';
import AccountNav from '@/components/account/AccountNav';

export const metadata: Metadata = {
  title: 'Hesabım | Nutopiano',
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(107,184,150,0.18),_transparent_28%),linear-gradient(180deg,#eff4f7_0%,#f7fafc_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <section className="overflow-hidden rounded-[28px] border border-[var(--neutral-200)] bg-[linear-gradient(135deg,#14352F_0%,#1F5649_58%,#C98963_100%)] px-6 py-6 text-white shadow-[var(--shadow-xl)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/65">
            Hesap Merkezi
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-serif md:text-4xl">Profil, guvenlik ve siparis akislariniz</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/78">
                Hesap cekirdegi, alisveris gecmisi ve erisiminiz olan panel gecisleri tek bir duzende toplandi.
              </p>
            </div>
            <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              Tek hesap • coklu panel
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-[28px] border border-[var(--neutral-200)] bg-white p-4 shadow-[var(--shadow-lg)] md:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--neutral-200)] pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--neutral-500)]">
                  Navigasyon
                </p>
                <p className="mt-1 text-sm text-[var(--neutral-600)]">
                  Hesap ve panel gecisleri
                </p>
              </div>
            </div>
          <AccountNav />
          </aside>

          <section className="min-w-0 rounded-[28px] border border-[var(--neutral-200)] bg-white p-4 shadow-[var(--shadow-lg)] md:p-6">
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}
