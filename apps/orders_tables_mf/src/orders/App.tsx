import { useState } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BranchProvider } from '@maison/ui';
import OrdersPage from './pages/OrdersPage';
import CreateOrderPage from './pages/CreateOrderPage';

function computeInitialPath() {
  return typeof window !== 'undefined'
    ? (window.location.pathname.replace(/^\/waiter/, '') + window.location.search) || '/orders'
    : '/orders';
}

export default function OrdersApp() {
  // Se calcula en cada montaje del componente, no en el scope del módulo:
  // Module Federation cachea este módulo entre navegaciones, así que un
  // valor a nivel de módulo quedaría congelado con la primera URL desde la
  // que se cargó orders_mf y ya no reflejaría navegaciones posteriores.
  const [initialPath] = useState(computeInitialPath);

  return (
    <MemoryRouter initialEntries={[initialPath]} initialIndex={0}>
      <BranchProvider>
        <Routes>
          <Route path="/orders/new" element={<CreateOrderPage />} />
          <Route path="/orders"     element={<OrdersPage />} />
          <Route path="*"           element={<OrdersPage />} />
        </Routes>
      </BranchProvider>
    </MemoryRouter>
  );
}
