import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BranchProvider } from '@maison/ui';
import OrdersPage from './pages/OrdersPage';

export default function OrdersApp() {
  return (
    <MemoryRouter initialEntries={['/orders']} initialIndex={0}>
      <BranchProvider>
        <Routes>
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="*"       element={<OrdersPage />} />
        </Routes>
      </BranchProvider>
    </MemoryRouter>
  );
}
