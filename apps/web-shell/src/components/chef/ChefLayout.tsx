'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthClient } from '@maison/auth-client';
import { apiClient } from '@maison/api-client';
import { emit } from '@maison/event-bus';
import { cn } from '@/lib/utils';
import { BranchSelector } from '@/components/ui/BranchSelector';
import {
  IconDashboard, IconOrders, IconInventory, IconAnalytics,
  IconLogOut, IconX,
} from '@maison/ui';

const CHEF_NAV = [
  { href: '/chef/dashboard', label: 'Dashboard', icon: IconDashboard },
  { href: '/chef/pedidos', label: 'Pedidos', icon: IconOrders },
  { href: '/chef/inventario', label: 'Inventario', icon: IconInventory },
  { href: '/chef/reportes', label: 'Reportes', icon: IconAnalytics },
] as const;

function IconMenu({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className={cn('h-4 w-4', className)} aria-hidden="true">
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function handleLogout() {
  const rt = AuthClient.getRefreshToken();
  apiClient.post('/auth/logout', { refreshToken: rt ?? '' }).catch(() => {});
  AuthClient.clearTokens();
  emit('auth:logout', undefined);
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul role="list" className="space-y-0.5 px-2">
      {CHEF_NAV.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
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
  );
}

export function ChefLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
            <span className="text-2xs font-semibold uppercase tracking-widest text-maison-cream-dim">Chef</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3" aria-label="Secciones">
          <NavList pathname={pathname} />
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
            <span className="text-2xs font-semibold uppercase tracking-widest text-maison-cream-dim">Chef</span>
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
        <header className="sticky top-0 z-10 flex h-[60px] items-center gap-3 border-b border-maison-border bg-surface-1 px-4 lg:px-5">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-maison-border bg-surface-2 text-maison-cream-muted transition-colors hover:bg-surface-3 hover:text-maison-cream lg:hidden"
            aria-label="Abrir menú de navegación"
            aria-haspopup="dialog"
          >
            <IconMenu />
          </button>
          <div className="hidden md:block">
            <BranchSelector />
          </div>
        </header>
        <main id="main-content" className="flex-1 px-5 py-6 pb-24 lg:px-7" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
