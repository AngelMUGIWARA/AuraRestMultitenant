import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import KitchenQueuePage from './pages/KitchenQueuePage';

export default function KitchenApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/kitchen" element={<KitchenQueuePage />} />
        <Route path="*"        element={<Navigate to="/kitchen" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
