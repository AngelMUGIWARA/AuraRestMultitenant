import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BranchProvider } from '@maison/ui';
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

export default function ManagerApp() {
  const initialPath = computeInitialPath();

  return (
    <BranchProvider>
      <MemoryRouter initialEntries={[initialPath]} initialIndex={0}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </MemoryRouter>
    </BranchProvider>
  );
}
