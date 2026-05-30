'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// redirect() server-only no es compatible con output:'export'.
// Usamos navegación cliente en su lugar.
export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return null;
}
