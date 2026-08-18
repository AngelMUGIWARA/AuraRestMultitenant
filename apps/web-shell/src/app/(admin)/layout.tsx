'use client';

import { usePathname } from 'next/navigation';
import { AuthClient } from '@maison/auth-client';
import { AuthGuard } from '@/components/shell/AuthGuard';
import { ManagerShell } from '@/components/admin/layout/ManagerShell';
import { OwnerShell } from '@/components/owner/layout/OwnerShell';
import { BranchProvider } from '@maison/ui';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { NavProvider } from '@/contexts/NavContext';
import { OWNER_NAV, MANAGER_NAV } from '@/lib/constants';

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

  // All other roles use ManagerShell with MANAGER_NAV
  return (
    <AuthGuard>
      <BranchProvider>
        <SidebarProvider>
          <NavProvider nav={MANAGER_NAV}>
            <ManagerShell>{children}</ManagerShell>
          </NavProvider>
        </SidebarProvider>
      </BranchProvider>
    </AuthGuard>
  );
}
