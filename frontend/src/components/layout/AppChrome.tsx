'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import Header from '@/components/Header';
import ChunkErrorRecovery from '@/components/common/ChunkErrorRecovery';
import FooterBar from '@/components/layout/FooterBar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { isBackofficePath } from '@/lib/app-shell';

type AppChromeProps = {
  children: ReactNode;
};

export default function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const backoffice = isBackofficePath(pathname);

  return (
    <>
      <ChunkErrorRecovery />
      <div
        className={`app-shell flex min-h-screen flex-col text-foreground ${
          backoffice ? 'bg-[#edf2f6]' : ''
        }`}
      >
        {!backoffice ? <Header /> : null}

        <main className={`app-main flex-1 ${backoffice ? '' : 'pb-20 md:pb-0'}`}>
          {backoffice ? children : <div className="app-content-frame">{children}</div>}
        </main>

        {!backoffice ? <FooterBar /> : null}
        {!backoffice ? <MobileBottomNav /> : null}
      </div>
    </>
  );
}
