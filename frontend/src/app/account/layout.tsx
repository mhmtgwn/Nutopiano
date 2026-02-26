import type { Metadata } from 'next';
import AccountNav from '@/components/account/AccountNav';

export const metadata: Metadata = {
  title: 'Hesabım | Nutopiano',
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#f4f0e8]">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 md:grid-cols-[270px_1fr] md:px-6 md:py-10">
        <aside className="overflow-hidden rounded-[28px] border border-[#e3d9c9] bg-[#fcf8f1] shadow-[0_20px_45px_rgba(26,60,52,0.08)]">
          <AccountNav />
        </aside>

        <section className="min-w-0 rounded-[28px] border border-[#e3d9c9] bg-[#f9f5ee] p-3 md:p-4">
          {children}
        </section>
      </div>
    </div>
  );
}
