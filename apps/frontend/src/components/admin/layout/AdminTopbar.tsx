'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ADMIN_NAV } from '@/lib/constants';
import { IconSearch, IconBell, IconSettings, IconChevronRight } from '@/components/ui/Icons';

type NavItem = { href: string; label: string };

function buildNavLookup(): NavItem[] {
  const items: NavItem[] = [];
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      items.push({ href: item.href, label: item.label });
    }
  }
  return items;
}

const NAV_LOOKUP = buildNavLookup();

function useBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  let path = '';
  for (const seg of segments) {
    path += `/${seg}`;
    const match = NAV_LOOKUP.find((item) => item.href === path);
    crumbs.push({ label: match?.label ?? capitalize(seg), href: path });
  }

  return crumbs;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function AdminTopbar() {
  const crumbs = useBreadcrumb();

  return (
    <header className="sticky top-0 z-10 flex h-[60px] items-center gap-3 border-b border-maison-border bg-surface-1 px-5">
      {/* Breadcrumbs */}
      <nav aria-label="Ruta de navegación" className="flex items-center gap-1.5 min-w-0">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && (
              <IconChevronRight className="h-3 w-3 text-maison-cream-dim flex-shrink-0" />
            )}
            {i === crumbs.length - 1 ? (
              <span
                className="text-sm font-medium text-maison-cream truncate"
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-sm text-maison-cream-muted hover:text-maison-cream transition-colors truncate"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Search */}
      <div className="relative ml-3 hidden max-w-xs flex-1 sm:flex">
        <label htmlFor="topbar-search" className="sr-only">
          Buscar
        </label>
        <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-maison-cream-dim" />
        <input
          id="topbar-search"
          type="search"
          placeholder="Buscar..."
          className={cn(
            'h-8 w-full rounded border border-maison-border bg-surface-2',
            'pl-8 pr-12 text-sm text-maison-cream placeholder:text-maison-cream-dim',
            'outline-none transition-colors focus:border-maison-border-subtle focus:bg-surface-3',
          )}
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-2xs text-maison-cream-dim border border-maison-border rounded px-1 py-0.5">
          ⌘K
        </kbd>
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded border border-maison-border bg-surface-2 text-maison-cream-muted transition-colors hover:bg-surface-3 hover:text-maison-cream"
          aria-label="Notificaciones"
        >
          <IconBell className="h-3.5 w-3.5" />
          <span
            className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-maison-ruby"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded border border-maison-border bg-surface-2 text-maison-cream-muted transition-colors hover:bg-surface-3 hover:text-maison-cream"
          aria-label="Configuración"
        >
          <IconSettings className="h-3.5 w-3.5" />
        </button>
        <div
          className="ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
          style={{ background: 'linear-gradient(140deg, #7A5530 0%, #D4975A 100%)' }}
          aria-hidden="true"
        >
          SA
        </div>
      </div>
    </header>
  );
}
