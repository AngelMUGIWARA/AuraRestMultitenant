import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BranchProvider } from './context/BranchContext';
import MenusPage from './pages/MenusPage';
import CategoriasPage from './pages/CategoriasPage';
import InventarioPage from './pages/InventarioPage';
import { emit } from '@maison/event-bus';

export { emit };

export default function MenuApp() {
  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/menus';
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
