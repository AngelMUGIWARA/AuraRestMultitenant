import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import POSPage from './pages/POSPage';

export default function CashierApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/cashier" element={<POSPage />} />
        <Route path="*"        element={<Navigate to="/cashier" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
