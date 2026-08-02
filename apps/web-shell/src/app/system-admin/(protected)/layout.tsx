import { SystemAdminAuthGuard } from '@/components/system-admin/SystemAdminAuthGuard';
import { SystemAdminLayout } from '@/components/system-admin/SystemAdminLayout';

export default function SystemAdminProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <SystemAdminAuthGuard>
      <SystemAdminLayout>{children}</SystemAdminLayout>
    </SystemAdminAuthGuard>
  );
}
