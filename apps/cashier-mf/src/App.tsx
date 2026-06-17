import { MemoryRouter, Routes, Route } from 'react-router-dom';
import POSPage from './pages/POSPage';

export default function CashierApp() {
  return (
    <MemoryRouter initialEntries={['/cashier']} initialIndex={0}>
      <Routes>
        <Route path="/cashier" element={<POSPage />} />
        <Route path="*"        element={<POSPage />} />
      </Routes>
    </MemoryRouter>
  );
}
