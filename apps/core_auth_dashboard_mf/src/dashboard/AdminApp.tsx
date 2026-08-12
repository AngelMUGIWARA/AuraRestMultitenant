import { BranchProvider } from '@maison/ui';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';

// El sidebar/topbar ya lo pone el AdminShell persistente de web-shell;
// aquí solo se decide qué contenido mostrar según la URL real.
//
// Antes esta función ignoraba la ruta salvo /admin/settings y siempre caía
// a UsersPage — por eso /dashboard-admin (el link "Dashboard" del nav de
// ADMIN) renderizaba la misma pantalla que /admin/users en vez del
// dashboard con métricas y el listado de sucursales.
export default function AdminApp() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';

  const content = (() => {
    if (pathname.startsWith('/admin/settings')) return <SettingsPage />;
    if (pathname.startsWith('/admin/users')) return <UsersPage />;
    return <DashboardPage />;
  })();

  return <BranchProvider>{content}</BranchProvider>;
}
