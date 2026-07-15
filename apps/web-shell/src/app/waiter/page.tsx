'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WaiterRootPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/waiter/tables'); }, [router]);
  return null;
}
