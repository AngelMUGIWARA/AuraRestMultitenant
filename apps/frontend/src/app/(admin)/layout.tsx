import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Dashboard · Maison Admin', template: '%s · Maison' },
};

// El shell ya no provee AdminShell/BranchProvider/SidebarProvider.
// El mfe-admin incluye su propio chrome completo.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
