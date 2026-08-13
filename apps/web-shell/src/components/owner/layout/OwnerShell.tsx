'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/contexts/SidebarContext';
import { OwnerSidebar } from './OwnerSidebar';
import { OwnerTopbar } from './OwnerTopbar';

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const { isMobileOpen, closeMobile } = useSidebar();
  const pathname = usePathname();

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  return (
    <div className="flex min-h-screen bg-surface-0">
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}
      <OwnerSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <OwnerTopbar />
        <main id="main-content" className="flex-1 px-5 py-6 pb-24 lg:px-7" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
