import { useLocation } from 'react-router-dom';
import { cn } from '../../utils';
import { useNav } from '../../context/NavContext';
import { useSidebar } from '../../context/SidebarContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import { BranchSelector } from '../ui/BranchSelector';
import { IconSearch, IconBell, IconChevronRight } from '@maison/ui';

function IconMenu({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className={cn('h-4 w-4', className)} aria-hidden="true">
      <line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function useBreadcrumb() {
  const { pathname } = useLocation();
  const nav = useNav();
  const lookup = nav.flatMap((g) => g.items.map((i) => ({ href: i.href, label: i.label })));
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let path = '';
  for (const seg of segments) {
    path += `/${seg}`;
    const match = lookup.find((item) => item.href === path);
    crumbs.push({ label: match?.label ?? (seg.charAt(0).toUpperCase() + seg.slice(1)), href: path });
  }
  return crumbs;
}

export function AdminTopbar() {
  const { pathname } = useLocation();
  const crumbs = useBreadcrumb();
  const { openMobile } = useSidebar();
  const showBranchSelector = pathname !== '/dashboard';
  return (
    <header className="sticky top-0 z-10 flex h-[60px] items-center gap-2 border-b border-maison-border bg-surface-1 px-4 transition-colors lg:px-5">
      <button type="button" onClick={openMobile}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-maison-border bg-surface-2 text-maison-cream-muted transition-colors hover:bg-surface-3 hover:text-maison-cream lg:hidden"
        aria-label="Abrir menú de navegación"><IconMenu /></button>
      <nav aria-label="Ruta de navegación" className="hidden min-w-0 items-center gap-1.5 sm:flex">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <IconChevronRight className="h-3 w-3 flex-shrink-0 text-maison-cream-dim" />}
            {i === crumbs.length - 1
              ? <span className="text-sm font-medium text-maison-cream" aria-current="page">{crumb.label}</span>
              : <a href={crumb.href} className="text-sm text-maison-cream-muted transition-colors hover:text-maison-cream">{crumb.label}</a>}
          </span>
        ))}
      </nav>
      <span className="text-sm font-medium text-maison-cream sm:hidden">{crumbs[crumbs.length - 1]?.label ?? 'Admin'}</span>
      {showBranchSelector && (
        <div className="ml-3 hidden md:block"><BranchSelector /></div>
      )}
      <div className="relative mx-3 hidden max-w-xs flex-1 lg:flex">
        <label htmlFor="topbar-search" className="sr-only">Buscar</label>
        <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-maison-cream-dim" />
        <input id="topbar-search" type="search" placeholder="Buscar..."
          className="h-8 w-full rounded border border-maison-border bg-surface-2 pl-8 pr-12 text-sm text-maison-cream placeholder:text-maison-cream-dim outline-none transition-colors focus:border-maison-amber" />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-maison-border px-1 py-0.5 font-mono text-2xs text-maison-cream-dim">⌘K</kbd>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <button type="button" className="relative flex h-8 w-8 items-center justify-center rounded border border-maison-border bg-surface-2 text-maison-cream-muted transition-colors hover:bg-surface-3 hover:text-maison-cream" aria-label="Notificaciones">
          <IconBell className="h-3.5 w-3.5" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-maison-ruby" aria-hidden="true" />
        </button>
        <div className="ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white cursor-pointer"
          style={{ background: 'linear-gradient(140deg, rgb(var(--color-accent-dim)) 0%, rgb(var(--color-accent)) 100%)' }} role="button" tabIndex={0}>SA</div>
      </div>
    </header>
  );
}
