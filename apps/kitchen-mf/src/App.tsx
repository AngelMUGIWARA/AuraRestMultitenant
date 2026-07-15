import { MemoryRouter, Routes, Route } from 'react-router-dom';
import KitchenQueuePage from './pages/KitchenQueuePage';

const initialPath = typeof window !== 'undefined'
  ? window.location.pathname.replace(/^\/waiter/, '') || '/kitchen'
  : '/kitchen';

export default function KitchenApp() {
  return (
    <MemoryRouter initialEntries={[initialPath]} initialIndex={0}>
      <Routes>
        <Route path="/kitchen" element={<KitchenQueuePage />} />
        <Route path="*"        element={<KitchenQueuePage />} />
      </Routes>
    </MemoryRouter>
  );
}
