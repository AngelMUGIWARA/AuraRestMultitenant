import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BranchProvider } from '@maison/ui';
import { SidebarProvider } from './context/SidebarContext';
import { NavProvider } from './context/NavContext';
import { AdminShell } from './components/layout/AdminShell';
import { OWNER_NAV } from './constants';
import DashboardPage from './pages/DashboardPage';
import SucursalesPage from './pages/SucursalesPage';
import SettingsPage from './pages/SettingsPage';
import React, { Suspense } from 'react';

const ReservacionesPage = React.lazy(() => import('../../reservations-mf/src/pages/ReservacionesPage'));

export default function OwnerApp() {
  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';
  return (
    <MemoryRouter initialEntries={[initialPath]} initialIndex={0}>
      <BranchProvider>
        <SidebarProvider>
          <NavProvider nav={OWNER_NAV}>
            <AdminShell>
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/sucursales" element={<SucursalesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route
                  path="/reservaciones"
                  element={
                    <Suspense>
                      <ReservacionesPage />
                    </Suspense>
                  }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AdminShell>
          </NavProvider>
        </SidebarProvider>
      </BranchProvider>
    </MemoryRouter>
  );
}
