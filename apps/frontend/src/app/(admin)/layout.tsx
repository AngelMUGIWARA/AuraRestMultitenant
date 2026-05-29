import type { Metadata } from 'next';
import { BranchProvider } from '@/context/BranchContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { AdminShell } from '@/components/admin/layout/AdminShell';

export const metadata: Metadata = {
  title: {
    default: 'Dashboard · Maison Admin',
    template: '%s · Maison',
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <BranchProvider>
      <SidebarProvider>
        <AdminShell>{children}</AdminShell>
      </SidebarProvider>
    </BranchProvider>
  );
}
