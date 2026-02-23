import type { Metadata } from 'next';
import AccountNav from '@/components/account/AccountNav';

export const metadata: Metadata = {
  title: 'Hesabım | Nutopiano',
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-140px)] bg-[var(--neutral-50)]">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[240px_1fr] md:px-6 md:py-10">
        <aside className="overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-md)]">
          <div className="border-b border-[var(--neutral-200)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--neutral-500)]">
              Hesabım
            </p>
          </div>
          <AccountNav />
        </aside>

        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
