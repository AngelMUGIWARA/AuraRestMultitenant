import type { Metadata } from 'next';
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar';
import { AdminTopbar } from '@/components/admin/layout/AdminTopbar';

export const metadata: Metadata = {
  title: {
    default: 'Dashboard · Maison Admin',
    template: '%s · Maison',
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-surface-0 lg:grid-cols-[240px_1fr]">
      <AdminSidebar />
      <div className="flex min-w-0 flex-col">
        <AdminTopbar />
        <main className="flex-1 px-6 py-6 pb-20 lg:px-7">{children}</main>
      </div>
    </div>
  );
}
