import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import AdminGuard from '@/components/admin/AdminGuard';

export const metadata: Metadata = {
  title: 'Platform Panel | Nutopiano',
  robots: { index: false, follow: false },
};

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard requireSuperAdmin>
      <AdminShell basePath="/platform">{children}</AdminShell>
    </AdminGuard>
  );
}
