import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BranchProvider } from './context/BranchContext';
import { SidebarProvider } from './context/SidebarContext';
import { AdminShell } from './components/layout/AdminShell';
import DashboardPage from './pages/DashboardPage';
import SucursalesPage from './pages/SucursalesPage';
import OrdersPage from './pages/OrdersPage';
import ReservacionesPage from './pages/ReservacionesPage';
import MenusPage from './pages/MenusPage';
import InventarioPage from './pages/InventarioPage';
import CategoriasPage from './pages/CategoriasPage';
import UsersPage from './pages/UsersPage';
import TenantsPage from './pages/TenantsPage';
import ReportesPage from './pages/ReportesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import IntegrationsPage from './pages/IntegrationsPage';
import LogsPage from './pages/LogsPage';

export default function AdminApp() {
  return (
    <BrowserRouter>
      <BranchProvider>
        <SidebarProvider>
          <AdminShell>
            <Routes>
              <Route path="/dashboard"    element={<DashboardPage />} />
              <Route path="/sucursales"   element={<SucursalesPage />} />
              <Route path="/orders"       element={<OrdersPage />} />
              <Route path="/reservaciones" element={<ReservacionesPage />} />
              <Route path="/menus"        element={<MenusPage />} />
              <Route path="/inventario"   element={<InventarioPage />} />
              <Route path="/categorias"   element={<CategoriasPage />} />
              <Route path="/users"        element={<UsersPage />} />
              <Route path="/tenants"      element={<TenantsPage />} />
              <Route path="/reportes"     element={<ReportesPage />} />
              <Route path="/analytics"    element={<AnalyticsPage />} />
              <Route path="/settings"     element={<SettingsPage />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/logs"         element={<LogsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AdminShell>
        </SidebarProvider>
      </BranchProvider>
    </BrowserRouter>
  );
}
