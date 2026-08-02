import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';

// El sidebar/topbar ya lo pone el AdminShell persistente de web-shell;
// aquí solo se decide qué contenido mostrar según la URL real.
export default function AdminApp() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/admin/users';

  if (pathname.startsWith('/admin/settings')) return <SettingsPage />;
  return <UsersPage />;
}
