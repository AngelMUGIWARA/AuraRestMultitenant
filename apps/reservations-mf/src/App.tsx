import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ReservacionesPage from './pages/ReservacionesPage';

export default function ReservationsApp() {
  return (
    <MemoryRouter initialEntries={['/reservaciones']} initialIndex={0}>
      <Routes>
        <Route path="/reservaciones" element={<ReservacionesPage />} />
        <Route path="*"              element={<ReservacionesPage />} />
      </Routes>
    </MemoryRouter>
  );
}
