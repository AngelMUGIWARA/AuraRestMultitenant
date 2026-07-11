import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BranchProvider } from '@maison/ui';
import { TablesPage } from './pages/TablesPage';

const initialPath = typeof window !== 'undefined'
  ? window.location.pathname.replace(/^\/waiter/, '') || '/tables'
  : '/tables';

export default function TablesApp() {
  return (
    <MemoryRouter initialEntries={[initialPath]} initialIndex={0}>
      <BranchProvider>
        <Routes>
          <Route path="/tables" element={<TablesPage />} />
          <Route path="*"       element={<TablesPage />} />
        </Routes>
      </BranchProvider>
    </MemoryRouter>
  );
}
