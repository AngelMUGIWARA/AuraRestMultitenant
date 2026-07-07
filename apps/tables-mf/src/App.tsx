import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BranchProvider } from '@maison/ui';
import TablesPage from './pages/TablesPage';

export default function OrdersApp() {
  return (
    <MemoryRouter initialEntries={['/orders']} initialIndex={0}>
      <BranchProvider>
        <Routes>
          <Route path="/orders" element={<TablesPagee />} />
          <Route path="*"       element={<TablesPage />} />
        </Routes>
      </BranchProvider>
    </MemoryRouter>
  );
}
