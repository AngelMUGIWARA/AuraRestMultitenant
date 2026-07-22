'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/shell/AuthGuard';
import { BranchProvider } from '@maison/ui';
import { WaiterLayout } from '@/components/waiter/WaiterLayout';
import { on } from '@maison/event-bus';

export default function WaiterGroupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const off = on('navigate:to', ({ path, replace }) => {
      if (replace) {
        router.replace(path);
      } else {
        router.push(path);
      }
    });
    return off;
  }, [router]);

  return (
    <AuthGuard allowedRoles={['WAITER']}>
      <BranchProvider>
        <WaiterLayout>{children}</WaiterLayout>
      </BranchProvider>
    </AuthGuard>
  );
}
