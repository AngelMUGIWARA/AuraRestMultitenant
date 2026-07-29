'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SystemAdminSession } from '@/lib/system-admin-session';
import { Skeleton } from '@maison/ui';

export function SystemAdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!SystemAdminSession.isAuthenticated()) {
      router.replace('/system-admin/login');
      return;
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col gap-4 p-8 animate-pulse">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  return <>{children}</>;
}
