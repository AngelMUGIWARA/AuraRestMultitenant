import { Routes, Route, Navigate } from 'react-router-dom';
import { RoleRouterShell } from './components/layout/RoleRouterShell';
import { ADMIN_NAV } from './constants';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';

export default function AdminApp() {
  return (
    <RoleRouterShell nav={ADMIN_NAV}>
      <Routes>
        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/admin/users" replace />} />
      </Routes>
    </RoleRouterShell>
  );
}
