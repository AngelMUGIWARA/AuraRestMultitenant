'use client';

import { usePathname } from 'next/navigation';
import { AuthClient } from '@maison/auth-client';
import { AuthGuard } from '@/components/shell/AuthGuard';
import { AdminShell } from '@/components/admin/layout/AdminShell';
import { OwnerShell } from '@/components/owner/layout/OwnerShell';
import { BranchProvider } from '@maison/ui';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { NavProvider } from '@/contexts/NavContext';
import { OWNER_NAV, ADMIN_NAV } from '@/lib/constants';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const role = AuthClient.getRole();

  // Normalize role for consistent comparison
  const normalizedRole = String(role ?? '').trim().toUpperCase();

  // OWNER uses OwnerShell with OWNER_NAV
  if (normalizedRole === 'OWNER') {
    return (
      <AuthGuard>
        <BranchProvider>
          <SidebarProvider>
            <NavProvider nav={OWNER_NAV}>
              <OwnerShell>{children}</OwnerShell>
            </NavProvider>
          </SidebarProvider>
        </BranchProvider>
      </AuthGuard>
    );
  }

  // All other roles use AdminShell with ADMIN_NAV
  return (
    <AuthGuard>
      <BranchProvider>
        <SidebarProvider>
          <NavProvider nav={ADMIN_NAV}>
            <AdminShell>{children}</AdminShell>
          </NavProvider>
        </SidebarProvider>
      </BranchProvider>
    </AuthGuard>
  );
}
