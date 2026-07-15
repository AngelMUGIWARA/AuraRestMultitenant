'use client';

import { AuthGuard } from '@/components/shell/AuthGuard';
import { BranchProvider } from '@maison/ui';
import { WaiterLayout } from '@/components/waiter/WaiterLayout';

export default function WaiterGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['WAITER']}>
      <BranchProvider>
        <WaiterLayout>{children}</WaiterLayout>
      </BranchProvider>
    </AuthGuard>
  );
}
