'use client';

import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/shell/AuthGuard';
import { AdminShell } from '@/components/admin/layout/AdminShell';
import { BranchProvider } from '@maison/ui';

const SELF_SHELLED_PREFIXES = ['/dashboard', '/sucursales', '/settings', '/users', '/admin'];

function hasOwnShell(pathname: string) {
  return SELF_SHELLED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AuthGuard>
      <BranchProvider>
        {hasOwnShell(pathname) ? children : <AdminShell>{children}</AdminShell>}
      </BranchProvider>
    </AuthGuard>
  );
}
