import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import SellerGuard from '@/components/seller/SellerGuard';
import SellerShell from '@/components/seller/SellerShell';

export const metadata: Metadata = {
  title: 'Seller Dashboard | Nutopiano',
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SellerGuard>
      <SellerShell>{children}</SellerShell>
    </SellerGuard>
  );
}
