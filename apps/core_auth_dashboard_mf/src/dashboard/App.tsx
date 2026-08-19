import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import SucursalesPage from './pages/SucursalesPage';
import SettingsPage from './pages/SettingsPage';

function computeInitialPath() {
  if (typeof window === 'undefined') return '/dashboard';
  const pathname = window.location.pathname;
  if (pathname.startsWith('/sucursales')) return '/sucursales';
  if (pathname.startsWith('/settings')) return '/settings';
  return '/dashboard';
}

// Content-only export for web-shell (no shell/sidebar/topbar — the
// web-shell (admin)/layout.tsx already provides OwnerShell/ManagerShell).
export default function OwnerApp() {
  const initialPath = computeInitialPath();

  return (
    <MemoryRouter initialEntries={[initialPath]} initialIndex={0}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/sucursales" element={<SucursalesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </MemoryRouter>
  );
}
