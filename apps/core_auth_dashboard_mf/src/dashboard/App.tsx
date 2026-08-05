import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BranchProvider } from '@maison/ui';
import { SidebarProvider } from './context/SidebarContext';
import { NavProvider } from './context/NavContext';
import { AdminShell } from './components/layout/AdminShell';
import { OWNER_NAV } from './constants';
import DashboardPage from './pages/DashboardPage';
import SucursalesPage from './pages/SucursalesPage';
import SettingsPage from './pages/SettingsPage';

// Embeddable content-only export for web-shell (no AdminShell, sidebar, or layout)
function DashboardContent() {
  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/sucursales" element={<SucursalesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

// Default export for web-shell: embeddable content only (no AdminShell, sidebar, or topbar)
export default function OwnerApp() {
  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';

  return (
    <MemoryRouter initialEntries={[initialPath]} initialIndex={0}>
      <DashboardContent />
    </MemoryRouter>
  );
}
