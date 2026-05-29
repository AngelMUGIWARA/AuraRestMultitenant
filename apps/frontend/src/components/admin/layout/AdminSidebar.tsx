'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ADMIN_NAV } from '@/lib/constants';
import {
  IconDashboard,
  IconAnalytics,
  IconTenants,
  IconUsers,
  IconMenus,
  IconOrders,
  IconSettings,
  IconIntegrations,
  IconLogs,
  IconLogOut,
} from '@/components/ui/Icons';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: IconDashboard,
  analytics: IconAnalytics,
  tenants: IconTenants,
  users: IconUsers,
  menus: IconMenus,
  orders: IconOrders,
  settings: IconSettings,
  integrations: IconIntegrations,
  logs: IconLogs,
};

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex flex-col h-screen sticky top-0 w-60 bg-surface-1 border-r border-maison-border"
      aria-label="Navegación principal"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-maison-border flex-shrink-0">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-[7px] flex-shrink-0"
          style={{
            background: 'linear-gradient(140deg, #7A5530 0%, #D4975A 100%)',
          }}
          aria-hidden="true"
        >
          <span className="font-display text-lg font-medium italic text-white leading-none">
            M
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-[17px] font-medium text-maison-cream leading-none">
            Maison
          </span>
          <span className="text-2xs font-semibold tracking-widest uppercase text-maison-cream-dim">
            Admin
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4" aria-label="Secciones">
        {ADMIN_NAV.map((group) => (
          <div key={group.label}>
            <p className="section-label">{group.label}</p>
            <ul role="list" className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICON_MAP[item.icon];
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn('nav-item', isActive && 'nav-item-active')}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {Icon && <Icon className="h-[15px] w-[15px] flex-shrink-0" />}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — admin user card */}
      <div className="flex-shrink-0 border-t border-maison-border px-2 py-3">
        <div className="flex items-center gap-2.5 rounded px-2 py-2 hover:bg-surface-2 transition-colors cursor-pointer group">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
            style={{
              background: 'linear-gradient(140deg, #2E2A22 0%, #5C5850 100%)',
            }}
            aria-hidden="true"
          >
            SA
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-maison-cream">Super Admin</p>
            <p className="truncate text-2xs text-maison-cream-dim">admin@maison.mx</p>
          </div>
          <IconLogOut className="h-3.5 w-3.5 text-maison-cream-dim opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
}
