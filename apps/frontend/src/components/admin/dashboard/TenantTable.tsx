import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatCurrency, getInitials } from '@/lib/utils';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge, PlanBadge } from '@/components/ui/Badge';
import { IconTenants, IconExternalLink } from '@/components/ui/Icons';
import type { Tenant } from '@/types/tenant.types';

interface TenantTableProps {
  tenants?: Tenant[];
  isLoading?: boolean;
  error?: boolean;
}

const COLUMNS = ['Tenant', 'Plan', 'Estado', 'Ingresos / mes', 'Pedidos', 'Rating', ''];

export function TenantTable({ tenants, isLoading = false, error = false }: TenantTableProps) {
  return (
    <section className="card" aria-labelledby="tenants-title">
      <div className="flex items-center justify-between border-b border-maison-border px-5 py-3.5">
        <div>
          <h2 id="tenants-title" className="text-sm font-medium text-maison-cream">
            Tenants Recientes
          </h2>
          <p className="text-2xs text-maison-cream-dim mt-0.5">
            Últimos registros en la plataforma
          </p>
        </div>
        <Link
          href="/tenants"
          className="text-2xs font-medium text-maison-amber hover:text-maison-amber-light transition-colors"
        >
          Ver todos →
        </Link>
      </div>

      {isLoading && <TableSkeleton />}

      {!isLoading && (error || !tenants?.length) && (
        <EmptyState
          icon={<IconTenants className="h-6 w-6" />}
          title="Sin tenants registrados"
          description="Los tenants aparecerán aquí cuando el API esté disponible."
          className="py-12"
        />
      )}

      {!isLoading && !error && tenants && tenants.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs" aria-labelledby="tenants-title">
            <thead>
              <tr className="border-b border-maison-border bg-surface-2">
                {COLUMNS.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className={cn(
                      'px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs',
                      col === 'Ingresos / mes' && 'text-right',
                      col === 'Pedidos' && 'text-right',
                      col === 'Rating' && 'text-right',
                    )}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <TenantRow key={tenant.id} tenant={tenant} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TenantRow({ tenant }: { tenant: Tenant }) {
  const initials = getInitials(tenant.name);
  return (
    <tr className="border-b border-maison-border last:border-b-0 hover:bg-surface-2 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-[11px] font-semibold text-white"
            style={{ background: 'linear-gradient(140deg, #2E2A22 0%, #5C5850 100%)' }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-maison-cream truncate max-w-[140px]">
              {tenant.name}
            </p>
            <p className="text-2xs text-maison-cream-dim">{tenant.ownerEmail}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <PlanBadge plan={tenant.plan} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={tenant.status} />
      </td>
      <td className="px-4 py-3 text-right font-mono text-maison-cream tabular-nums">
        {formatCurrency(tenant.monthlyRevenue)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-maison-cream-muted tabular-nums">
        {tenant.monthlyOrders.toLocaleString('es-MX')}
      </td>
      <td className="px-4 py-3 text-right font-mono text-maison-gold tabular-nums">
        ★ {tenant.avgRating.toFixed(1)}
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/tenants/${tenant.id}`}
          className="flex items-center justify-end text-maison-cream-dim hover:text-maison-amber transition-colors"
          aria-label={`Ver detalle de ${tenant.name}`}
        >
          <IconExternalLink className="h-3.5 w-3.5" />
        </Link>
      </td>
    </tr>
  );
}

function TableSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="border-b border-maison-border bg-surface-2 px-4 py-2.5">
        <div className="flex gap-4">
          {[1, 0.5, 0.5, 0.6, 0.4, 0.3, 0.2].map((flex, i) => (
            <Skeleton key={i} className="h-2.5" style={{ flex }} />
          ))}
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonRow key={i} cols={7} />
      ))}
    </div>
  );
}
