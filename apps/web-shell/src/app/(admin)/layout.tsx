'use client';

import { usePathname } from 'next/navigation';
import { AuthClient } from '@maison/auth-client';
import { AuthGuard } from '@/components/shell/AuthGuard';
import { AdminShell } from '@/components/admin/layout/AdminShell';
import { BranchProvider } from '@maison/ui';

// Siempre traen su propio shell, sin importar el rol.
const SELF_SHELLED_PREFIXES = ['/settings', '/users'];

// Solo traen su propio shell (el de OWNER) cuando el rol es OWNER; para
// cualquier otro rol (p. ej. ADMIN) se usa el AdminShell persistente.
const OWNER_ONLY_SHELLED_PREFIXES = ['/dashboard', '/sucursales'];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function hasOwnShell(pathname: string) {
  if (matchesPrefix(pathname, SELF_SHELLED_PREFIXES)) return true;
  if (matchesPrefix(pathname, OWNER_ONLY_SHELLED_PREFIXES)) {
    return AuthClient.getRole() === 'OWNER';
  }
  return false;
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
