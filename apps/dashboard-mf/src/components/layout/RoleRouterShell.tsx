import { MemoryRouter } from 'react-router-dom';
import { BranchProvider } from '@maison/ui';
import { SidebarProvider } from '../../context/SidebarContext';
import { NavProvider } from '../../context/NavContext';
import { AdminShell } from './AdminShell';
import type { NavConfig } from '../../constants';

interface RoleRouterShellProps {
  nav: NavConfig;
  children: React.ReactNode;
}

export function RoleRouterShell({ nav, children }: RoleRouterShellProps) {
  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  return (
    <MemoryRouter initialEntries={[initialPath]} initialIndex={0}>
      <BranchProvider>
        <SidebarProvider>
          <NavProvider nav={nav}>
            <AdminShell>{children}</AdminShell>
          </NavProvider>
        </SidebarProvider>
      </BranchProvider>
    </MemoryRouter>
  );
}
