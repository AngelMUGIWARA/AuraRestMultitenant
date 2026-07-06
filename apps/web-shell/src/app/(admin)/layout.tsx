'use client';

import { AuthGuard } from '@/components/shell/AuthGuard';
import { AdminShell } from '@/components/admin/layout/AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AdminShell>{children}</AdminShell>
    </AuthGuard>
  );
}
