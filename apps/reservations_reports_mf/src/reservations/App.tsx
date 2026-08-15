import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BranchProvider } from '@maison/ui';
import ReservacionesPage from './pages/ReservacionesPage';

const initialPath = typeof window !== 'undefined'
  ? window.location.pathname.replace(/^\/waiter\//, '') || 'reservaciones'
  : '/reservaciones';
const normalized = initialPath.startsWith('/') ? initialPath : `/${initialPath}`;

export default function ReservationsApp() {
  return (
    <BranchProvider>
      <MemoryRouter initialEntries={[normalized]} initialIndex={0}>
        <Routes>
          <Route path="/reservaciones" element={<ReservacionesPage />} />
          <Route path="*"              element={<ReservacionesPage />} />
        </Routes>
      </MemoryRouter>
    </BranchProvider>
  );
}
