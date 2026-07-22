'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { BranchSelector } from '@/components/ui/BranchSelector';
import { AuthClient } from '@maison/auth-client';
import { emit } from '@maison/event-bus';

const NAV_ITEMS = [
  { href: '/waiter/tables', label: 'Mesas', icon: 'tables' },
  { href: '/waiter/orders', label: 'Pedidos', icon: 'orders' },
  { href: '/waiter/kitchen', label: 'Cocina', icon: 'kitchen' },
  { href: '/waiter/reservations', label: 'Reservaciones', icon: 'reservations' },
] as const;

function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    tables: <><rect x="3" y="7" width="18" height="3" rx="1" /><path d="M6 10v7M18 10v7M9 17h6" /></>,
    orders: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></>,
    kitchen: <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
    reservations: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths[icon]}
    </svg>
  );
}

export function WaiterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const userName = (() => {
    try { return AuthClient.getUser()?.name ?? ''; } catch { return ''; }
  })();

  return (
    <div className="flex min-h-screen flex-col bg-surface-0">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-maison-border bg-surface-1 px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-maison-cream">Maison</h1>
          <span className="rounded bg-maison-amber/20 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-maison-amber">
            Mesero
          </span>
        </div>
        <div className="flex items-center gap-3">
          <BranchSelector />
          {userName && (
            <span className="hidden text-sm text-maison-cream-muted sm:inline">{userName}</span>
          )}
          <button
            type="button"
            onClick={() => { AuthClient.clearTokens(); emit('auth:logout', undefined); }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-maison-cream-dim transition-colors hover:bg-surface-2 hover:text-maison-cream"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-maison-border bg-surface-1">
        <div className="mx-auto flex max-w-lg justify-around py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                  isActive ? 'text-maison-amber' : 'text-maison-cream-dim hover:text-maison-cream'
                }`}
              >
                <NavIcon icon={item.icon} className="h-5 w-5" />
                <span className="text-2xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
