'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SystemAdminSession } from '@/lib/system-admin-session';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const NAV_ITEMS = [
  { href: '/system-admin/tenants', label: 'Restaurantes' },
  { href: '/system-admin/audit-log', label: 'Auditoría' },
] as const;

export function SystemAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const email = SystemAdminSession.getEmail();

  function handleLogout() {
    SystemAdminSession.clear();
    router.replace('/system-admin/login');
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-0">
      <header className="flex items-center justify-between border-b border-maison-border bg-surface-1 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-lg font-medium text-maison-cream">Maison</h1>
          <span className="rounded bg-maison-ruby/20 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-maison-ruby">
            Super Admin
          </span>
        </div>
        <nav className="flex items-center gap-1" aria-label="Secciones">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  'rounded px-3 py-1.5 text-xs font-medium transition-colors ' +
                  (isActive
                    ? 'bg-surface-2 text-maison-cream'
                    : 'text-maison-cream-dim hover:bg-surface-2 hover:text-maison-cream')
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {email && <span className="hidden text-xs text-maison-cream-muted sm:inline">{email}</span>}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded px-3 py-1.5 text-xs font-medium text-maison-cream-dim transition-colors hover:bg-surface-2 hover:text-maison-cream"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
