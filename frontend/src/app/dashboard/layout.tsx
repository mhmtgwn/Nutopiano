import type { ReactNode } from 'react';
import SellerGuard from '@/components/seller/SellerGuard';
import SellerShell from '@/components/seller/SellerShell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SellerGuard>
      <SellerShell>{children}</SellerShell>
    </SellerGuard>
  );
}
