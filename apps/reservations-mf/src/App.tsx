import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BranchProvider } from '@maison/ui';
import ReservacionesPage from './pages/ReservacionesPage';

export default function ReservationsApp() {
  return (
    <BranchProvider>
      <MemoryRouter initialEntries={['/reservaciones']} initialIndex={0}>
        <Routes>
          <Route path="/reservaciones" element={<ReservacionesPage />} />
          <Route path="*"              element={<ReservacionesPage />} />
        </Routes>
      </MemoryRouter>
    </BranchProvider>
  );
}
