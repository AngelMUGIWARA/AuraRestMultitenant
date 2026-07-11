import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BranchProvider } from '@maison/ui';
import OrdersPage from './pages/OrdersPage';
import CreateOrderPage from './pages/CreateOrderPage';

const initialPath = typeof window !== 'undefined'
  ? window.location.pathname.replace(/^\/waiter/, '') || '/orders'
  : '/orders';

export default function OrdersApp() {
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
