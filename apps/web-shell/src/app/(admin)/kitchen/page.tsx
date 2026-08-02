'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthClient } from '@maison/auth-client';
import { LazyMF } from '@/components/shell/LazyMF';

const CHEF_ROLES = ['CHEF', 'KITCHEN_STAFF'];

export default function Page() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (CHEF_ROLES.includes(AuthClient.getRole() ?? '')) {
      router.replace('/chef/pedidos');
      return;
    }
    setAllowed(true);
  }, [router]);

  if (!allowed) return null;
  return <LazyMF remote="kitchen_mf" module="./App" lazy={true} />;
}
