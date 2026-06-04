import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BranchProvider } from './context/BranchContext';
import { SidebarProvider } from './context/SidebarContext';
import { AdminShell } from './components/layout/AdminShell';
import DashboardPage from './pages/DashboardPage';
import SucursalesPage from './pages/SucursalesPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';

export default function DashboardApp() {
  return (
    <BrowserRouter>
      <BranchProvider>
        <SidebarProvider>
          <AdminShell>
            <Routes>
              <Route path="/dashboard"  element={<DashboardPage />} />
              <Route path="/sucursales" element={<SucursalesPage />} />
              <Route path="/users"      element={<UsersPage />} />
              <Route path="/settings"   element={<SettingsPage />} />
              <Route path="*"           element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AdminShell>
        </SidebarProvider>
      </BranchProvider>
    </BrowserRouter>
  );
}
