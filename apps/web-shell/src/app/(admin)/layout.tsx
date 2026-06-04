import type { Metadata } from 'next';
import { AuthGuard } from '@/components/shell/AuthGuard';

export const metadata: Metadata = {
  title: { default: 'Maison Admin', template: '%s · Maison' },
};

// Cada MFE provee su propio chrome (sidebar + topbar).
// El shell solo aplica el guard de autenticación.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
