'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthClient } from '@maison/auth-client';
import { apiClient } from '@maison/api-client';
import { emit } from '@maison/event-bus';
import { cn } from '@/lib/utils';
import { BranchSelector } from '@/components/ui/BranchSelector';
import { CASHIER_NAV } from '@/lib/constants';
import {
  IconDashboard, IconOrders, IconCalendar, IconSettings,
  IconLogOut, IconX,
} from '@maison/ui';

function IconCashier({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className={cn('h-4 w-4', className)} aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M12 15h.01" />
    </svg>
  );
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: IconDashboard,
  orders: IconOrders,
  reservations: IconCalendar,
  settings: IconSettings,
};

function handleLogout() {
  const rt = AuthClient.getRefreshToken();
  apiClient.post('/auth/logout', { refreshToken: rt ?? '' }).catch(() => {});
  AuthClient.clearTokens();
  emit('auth:logout', undefined);
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="space-y-4 px-2">
      {CASHIER_NAV.map((group) => (
        <div key={group.label}>
          <p className="section-label">{group.label}</p>
          <ul role="list" className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = ICON_MAP[item.icon] ?? IconDashboard;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn('nav-item', isActive && 'nav-item-active')}
                  >
                    <Icon className="h-[15px] w-[15px] flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function CashierLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const userEmail = AuthClient.getUser()?.email ?? '';
  const role = (AuthClient.getRole() ?? 'Cajero') as string;

  return (
    <div className="flex min-h-screen bg-surface-0">
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className="relative hidden h-screen w-60 flex-shrink-0 flex-col border-r border-maison-border bg-surface-1 lg:sticky lg:top-0 lg:flex"
        aria-label="Navegación principal"
      >
        <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-maison-border px-4 py-4">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[7px]"
            style={{ background: 'linear-gradient(140deg, rgb(var(--color-accent-dim)) 0%, rgb(var(--color-accent)) 100%)' }}
            aria-hidden="true"
          >
            <span className="font-display text-lg font-medium italic leading-none text-white">M</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-display text-[17px] font-medium leading-none text-maison-cream">Maison</span>
            <span className="text-2xs font-semibold uppercase tracking-widest text-maison-cream-dim">Cajero</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3" aria-label="Secciones">
          <NavList pathname={pathname} />
        </nav>

        <div className="flex-shrink-0 border-t border-maison-border">
          <div className="px-2 pt-3">
            <div className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-2 transition-colors hover:bg-surface-2 group" onClick={handleLogout}>
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                style={{ background: 'linear-gradient(140deg, rgb(var(--color-border)) 0%, rgb(var(--color-muted)) 100%)' }}
                aria-hidden="true"
              >
                {(role?.slice(0, 2) ?? 'CA').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-maison-cream">{role}</p>
                {userEmail && <p className="truncate text-2xs text-maison-cream-dim">{userEmail}</p>}
              </div>
              <IconLogOut className="h-3.5 w-3.5 flex-shrink-0 text-maison-cream-dim opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-maison-border bg-surface-1 shadow-card-hover',
          'transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:hidden',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Menú de navegación"
        aria-hidden={!isMobileOpen}
      >
        <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-maison-border px-4 py-4">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[7px]"
            style={{ background: 'linear-gradient(140deg, rgb(var(--color-accent-dim)) 0%, rgb(var(--color-accent)) 100%)' }}
            aria-hidden="true"
          >
            <span className="font-display text-lg font-medium italic leading-none text-white">M</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-display text-[17px] font-medium leading-none text-maison-cream">Maison</span>
            <span className="text-2xs font-semibold uppercase tracking-widest text-maison-cream-dim">Cajero</span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded text-maison-cream-muted hover:bg-surface-2 hover:text-maison-cream"
            aria-label="Cerrar menú"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3" aria-label="Secciones">
          <NavList pathname={pathname} onNavigate={() => setIsMobileOpen(false)} />
        </nav>

        <div className="flex-shrink-0 border-t border-maison-border px-2 py-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded px-2 py-2 text-sm text-maison-cream-dim transition-colors hover:bg-surface-2 hover:text-maison-cream"
          >
            <IconLogOut className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* z-20: must out-stack cashier-mf's own internal sticky header
            (z-10, see POSPage.tsx), which is a sibling stacking context
            (position: sticky + z-index both create one) that would
            otherwise sit on top of this header's BranchSelector dropdown
            because it comes later in DOM order. */}
        <header className="sticky top-0 z-20 flex h-[60px] items-center gap-3 border-b border-maison-border bg-surface-1 px-4 lg:px-5">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-maison-border bg-surface-2 text-maison-cream-muted transition-colors hover:bg-surface-3 hover:text-maison-cream lg:hidden"
            aria-label="Abrir menú de navegación"
            aria-haspopup="dialog"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
          <div className="hidden md:block">
            <BranchSelector />
          </div>
        </header>
        <main id="main-content" className="flex-1 px-5 py-6 lg:px-7" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
