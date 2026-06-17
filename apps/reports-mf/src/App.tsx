import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ReportesPage from './pages/ReportesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LogsPage from './pages/LogsPage';
import IntegrationsPage from './pages/IntegrationsPage';

export default function ReportsApp() {
  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/reportes';
  return (
    <MemoryRouter initialEntries={[initialPath]} initialIndex={0}>
      <Routes>
        <Route path="/reportes"     element={<ReportesPage />} />
        <Route path="/analytics"    element={<AnalyticsPage />} />
        <Route path="/logs"         element={<LogsPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="*"             element={<ReportesPage />} />
      </Routes>
    </MemoryRouter>
  );
}
