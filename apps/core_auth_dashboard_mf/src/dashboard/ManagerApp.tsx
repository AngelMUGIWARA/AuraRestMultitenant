import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';

function computeInitialPath() {
  if (typeof window === 'undefined') return '/dashboard';
  const pathname = window.location.pathname;
  if (pathname.startsWith('/admin/settings')) return '/admin/settings';
  if (pathname.startsWith('/admin/users')) return '/admin/users';
  return '/dashboard';
}

// Content-only export for web-shell (no BranchProvider — the
// web-shell (admin)/layout.tsx already provides BranchProvider).
export default function ManagerApp() {
  const initialPath = computeInitialPath();

  return (
    <MemoryRouter initialEntries={[initialPath]} initialIndex={0}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </MemoryRouter>
  );
}
