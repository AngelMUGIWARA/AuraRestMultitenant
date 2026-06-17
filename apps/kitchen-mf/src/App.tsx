import { MemoryRouter, Routes, Route } from 'react-router-dom';
import KitchenQueuePage from './pages/KitchenQueuePage';

export default function KitchenApp() {
  return (
    <MemoryRouter initialEntries={['/kitchen']} initialIndex={0}>
      <Routes>
        <Route path="/kitchen" element={<KitchenQueuePage />} />
        <Route path="*"        element={<KitchenQueuePage />} />
      </Routes>
    </MemoryRouter>
  );
}
