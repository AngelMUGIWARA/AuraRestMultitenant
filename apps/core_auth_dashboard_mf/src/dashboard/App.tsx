import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthClient } from '@maison/auth-client';
import { BranchProvider } from '@maison/ui';
import { SidebarProvider } from './context/SidebarContext';
import { NavProvider } from './context/NavContext';
import { AdminShell } from './components/layout/AdminShell';
import { OWNER_NAV } from './constants';
import DashboardPage from './pages/DashboardPage';
import SucursalesPage from './pages/SucursalesPage';
import SettingsPage from './pages/SettingsPage';

// Cuando el rol es OWNER, web-shell deja esta ruta "self-shelled" y aquí se
// trae el propio shell (nav reducido, solo revenue/branches/settings). Para
// cualquier otro rol, web-shell ya envuelve con su AdminShell persistente,
// así que aquí solo se renderiza el contenido.
export default function OwnerApp() {
  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';
  const isOwner = typeof window !== 'undefined' && AuthClient.getRole() === 'OWNER';

  const content = (
    <Routes>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/sucursales" element={<SucursalesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );

  return (
    <MemoryRouter initialEntries={[initialPath]} initialIndex={0}>
      {isOwner ? (
        <BranchProvider>
          <SidebarProvider>
            <NavProvider nav={OWNER_NAV}>
              <AdminShell>{content}</AdminShell>
            </NavProvider>
          </SidebarProvider>
        </BranchProvider>
      ) : content}
    </MemoryRouter>
  );
}
