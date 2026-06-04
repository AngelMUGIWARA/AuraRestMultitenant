import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ReportesPage from './pages/ReportesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LogsPage from './pages/LogsPage';
import IntegrationsPage from './pages/IntegrationsPage';

export default function ReportsApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/reportes"     element={<ReportesPage />} />
        <Route path="/analytics"    element={<AnalyticsPage />} />
        <Route path="/logs"         element={<LogsPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="*"             element={<Navigate to="/reportes" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
