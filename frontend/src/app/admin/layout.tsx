import type { ReactNode } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import AdminGuard from '@/components/admin/AdminGuard';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
