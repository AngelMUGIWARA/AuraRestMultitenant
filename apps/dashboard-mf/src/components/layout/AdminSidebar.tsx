import { useLocation } from 'react-router-dom';
import { AuthClient } from '@maison/auth-client';
import { cn } from '../../utils';
import { useNav } from '../../context/NavContext';
import { useSidebar } from '../../context/SidebarContext';
import {
  IconDashboard, IconAnalytics, IconInventory, IconCategories, IconCalendar,
  IconUsers, IconMenus, IconOrders, IconSettings, IconIntegrations, IconLogs,
  IconLogOut, IconChevronLeft, IconChevronRight, IconX,
} from '@maison/ui';

function IconBranches({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className={cn('h-4 w-4', className)} aria-hidden="true">
      <path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" />
    </svg>
  );
}

function IconKitchen({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className={cn('h-4 w-4', className)} aria-hidden="true">
      <path d="M6 2v20M18 2v20M6 12h12M3 7h18M3 17h18" />
    </svg>
  );
}

function IconCashier({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className={cn('h-4 w-4', className)} aria-hidden="true">
      <rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 10h20" />
    </svg>
  );
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: IconDashboard, analytics: IconAnalytics, inventory: IconInventory,
  categories: IconCategories, reservations: IconCalendar, branches: IconBranches,
  users: IconUsers, menus: IconMenus, orders: IconOrders, kitchen: IconKitchen,
  cashier: IconCashier, settings: IconSettings, integrations: IconIntegrations, logs: IconLogs,
};

function BrandMark() {
  return (
    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[7px]"
      style={{ background: 'linear-gradient(140deg, rgb(var(--color-accent-dim)) 0%, rgb(var(--color-accent)) 100%)' }} aria-hidden="true">
      <span className="font-display text-lg font-medium italic leading-none text-white">M</span>
    </div>
  );
}

function NavItem({ href, label, icon, isActive, isCollapsed }: { href: string; label: string; icon: string; isActive: boolean; isCollapsed: boolean }) {
  const Icon = ICON_MAP[icon];
  return (
    <li>
      <a href={href} title={isCollapsed ? label : undefined} aria-current={isActive ? 'page' : undefined}
        className={cn('nav-item', isCollapsed && 'justify-center px-0 py-2.5', isActive && 'nav-item-active')}>
        {Icon && <Icon className="h-[15px] w-[15px] flex-shrink-0" />}
        {!isCollapsed && <span className="truncate">{label}</span>}
      </a>
    </li>
  );
}

function handleLogout() {
  AuthClient.clearTokens();
  window.location.replace('/auth/login');
}

function SidebarContent({ isCollapsed, isMobile, onClose, onToggle }: { isCollapsed: boolean; isMobile?: boolean; onClose?: () => void; onToggle: () => void }) {
  const { pathname } = useLocation();
  const nav = useNav();
  const role = AuthClient.getRole();
  const email = AuthClient.getUser()?.email ?? '';
  const initials = (role ?? 'US').slice(0, 2);
  return (
    <>
      <div className={cn('flex flex-shrink-0 items-center border-b border-maison-border', isCollapsed ? 'justify-center px-3 py-4' : 'gap-2.5 px-4 py-4')}>
        <BrandMark />
        {!isCollapsed && (
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-display text-[17px] font-medium leading-none text-maison-cream">Maison</span>
            <span className="text-2xs font-semibold uppercase tracking-widest text-maison-cream-dim">Admin</span>
          </div>
        )}
        {isMobile && onClose && (
          <button type="button" onClick={onClose} className="ml-auto flex h-7 w-7 items-center justify-center rounded text-maison-cream-muted hover:bg-surface-2 hover:text-maison-cream" aria-label="Cerrar menú">
            <IconX className="h-4 w-4" />
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Secciones">
        <div className={cn('space-y-4', isCollapsed ? 'px-1.5' : 'px-2')}>
          {nav.map((group) => (
            <div key={group.label}>
              {isCollapsed ? <div className="my-2 h-px bg-maison-border" /> : <p className="section-label">{group.label}</p>}
              <ul role="list" className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon}
                    isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                    isCollapsed={isCollapsed} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
      <div className="flex-shrink-0 border-t border-maison-border">
        {!isCollapsed && (
          <div className="px-2 pt-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded px-2 py-2 text-left transition-colors hover:bg-surface-2 group"
              aria-label="Cerrar sesión"
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                style={{ background: 'linear-gradient(140deg, rgb(var(--color-border)) 0%, rgb(var(--color-muted)) 100%)' }} aria-hidden="true">{initials}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-maison-cream">{role ?? 'Usuario'}</p>
                {email && <p className="truncate text-2xs text-maison-cream-dim">{email}</p>}
              </div>
              <IconLogOut className="h-3.5 w-3.5 flex-shrink-0 text-maison-cream-dim opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </div>
        )}
        {!isMobile && (
          <button type="button" onClick={onToggle}
            className={cn('flex w-full items-center gap-2 px-3 py-3 text-2xs font-medium text-maison-cream-dim transition-colors hover:bg-surface-2 hover:text-maison-cream', isCollapsed ? 'justify-center' : 'justify-end')}
            aria-label={isCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}>
            {isCollapsed ? <IconChevronRight className="h-3.5 w-3.5" /> : <><span>Colapsar</span><IconChevronLeft className="h-3.5 w-3.5" /></>}
          </button>
        )}
      </div>
    </>
  );
}

export function AdminSidebar() {
  const { isCollapsed, isMobileOpen, toggleCollapsed, closeMobile } = useSidebar();
  return (
    <>
      <aside className={cn('relative hidden flex-col lg:flex h-screen sticky top-0 flex-shrink-0 bg-surface-1 border-r border-maison-border transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]', isCollapsed ? 'w-[60px]' : 'w-60')} aria-label="Navegación principal">
        <SidebarContent isCollapsed={isCollapsed} onToggle={toggleCollapsed} />
      </aside>
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-72 flex-col lg:hidden bg-surface-1 border-r border-maison-border shadow-card-hover transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]', isMobileOpen ? 'translate-x-0' : '-translate-x-full')} aria-label="Menú de navegación" aria-hidden={!isMobileOpen}>
        <SidebarContent isCollapsed={false} isMobile onClose={closeMobile} onToggle={closeMobile} />
      </aside>
    </>
  );
}
