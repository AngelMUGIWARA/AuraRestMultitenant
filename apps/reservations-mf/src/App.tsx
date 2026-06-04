import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ReservacionesPage from './pages/ReservacionesPage';

export default function ReservationsApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/reservaciones" element={<ReservacionesPage />} />
        <Route path="*" element={<Navigate to="/reservaciones" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
