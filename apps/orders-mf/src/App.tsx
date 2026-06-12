import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BranchProvider } from './context/BranchContext';
import OrdersPage from './pages/OrdersPage';

export default function OrdersApp() {
  return (
    <BrowserRouter>
      <BranchProvider>
        <Routes>
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="*"       element={<Navigate to="/orders" replace />} />
        </Routes>
      </BranchProvider>
    </BrowserRouter>
  );
}
