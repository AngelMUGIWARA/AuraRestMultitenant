'use client';

import { AuthGuard } from '@/components/shell/AuthGuard';
import { ChefLayout } from '@/components/chef/ChefLayout';
import { BranchProvider } from '@maison/ui';

export default function ChefGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['CHEF', 'KITCHEN_STAFF']}>
      <BranchProvider>
        <ChefLayout>{children}</ChefLayout>
      </BranchProvider>
    </AuthGuard>
  );
}
