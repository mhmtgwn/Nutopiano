import type { Metadata } from 'next';
import AccountNav from '@/components/account/AccountNav';

export const metadata: Metadata = {
  title: 'Hesabım | Nutopiano',
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-140px)] bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[240px_1fr] md:px-6 md:py-10">
        <aside className="min-w-0 border-r border-[#e5e7eb] pr-4 md:pr-6">
          <AccountNav />
        </aside>

        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
