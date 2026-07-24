import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BranchProvider } from '@maison/ui';
import MenusPage from './pages/MenusPage';
import CategoriasPage from './pages/CategoriasPage';
import InventarioPage from './pages/InventarioPage';
import { emit } from '@maison/event-bus';

export { emit };

function resolveInitialPath(pathname: string) {
  if (pathname.endsWith('/inventario')) return '/inventario';
  if (pathname.endsWith('/categorias')) return '/categorias';
  return '/menus';
}

export default function MenuApp() {
  const initialPath = typeof window !== 'undefined'
    ? resolveInitialPath(window.location.pathname)
    : '/menus';
  return (
    <BranchProvider>
      <MemoryRouter initialEntries={[initialPath]} initialIndex={0}>
        <Routes>
          <Route path="/menus"      element={<MenusPage />} />
          <Route path="/categorias" element={<CategoriasPage />} />
          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="*"           element={<MenusPage />} />
        </Routes>
      </MemoryRouter>
    </BranchProvider>
  );
}
