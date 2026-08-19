'use client';

import { AuthGuard } from '@/components/shell/AuthGuard';
import { CashierLayout } from '@/components/cashier/CashierLayout';
import { BranchProvider } from '@maison/ui';

export default function CashierGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['CASHIER']}>
      <BranchProvider>
        <CashierLayout>{children}</CashierLayout>
      </BranchProvider>
    </AuthGuard>
  );
}
