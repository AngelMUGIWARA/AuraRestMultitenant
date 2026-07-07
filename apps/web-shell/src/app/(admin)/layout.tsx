'use client';

import { AuthGuard } from '@/components/shell/AuthGuard';
import { AdminShell } from '@/components/admin/layout/AdminShell';
import { BranchProvider } from '@maison/ui';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <BranchProvider>
        <AdminShell>{children}</AdminShell>
      </BranchProvider>
    </AuthGuard>
  );
}
