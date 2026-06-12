import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BranchProvider } from './context/BranchContext';
import MenusPage from './pages/MenusPage';
import CategoriasPage from './pages/CategoriasPage';
import InventarioPage from './pages/InventarioPage';
import { emit } from '@maison/event-bus';

// Publish menu:updated whenever a menu item changes
export { emit };

export default function MenuApp() {
  return (
    <BranchProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/menus"      element={<MenusPage />} />
          <Route path="/categorias" element={<CategoriasPage />} />
          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="*"           element={<Navigate to="/menus" replace />} />
        </Routes>
      </BrowserRouter>
    </BranchProvider>
  );
}
