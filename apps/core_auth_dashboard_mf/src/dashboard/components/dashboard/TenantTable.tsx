import { cn, formatCurrency, getInitials } from '../../utils';
import { Skeleton, SkeletonRow, EmptyState, IconTenants, IconExternalLink } from '@maison/ui';
import type { Tenant, TenantStatus, TenantPlan } from '@maison/types';
import { TENANT_STATUS_LABELS, PLAN_LABELS } from '../../constants';

const STATUS_BADGE: Record<TenantStatus, string> = { active: 'badge-active', inactive: 'badge-inactive', suspended: 'badge-suspended', trial: 'badge-trial' };
const PLAN_BADGE: Record<TenantPlan, string> = { starter: 'badge badge-inactive', professional: 'badge bg-maison-amber-glow text-maison-amber', enterprise: 'badge bg-maison-ruby-bg text-maison-ruby' };

function StatusBadge({ status }: { status: TenantStatus }) { return <span className={cn('badge', STATUS_BADGE[status])}><span className="h-1 w-1 rounded-full bg-current" />{TENANT_STATUS_LABELS[status]}</span>; }
function PlanBadge({ plan }: { plan: TenantPlan }) { return <span className={PLAN_BADGE[plan]}>{PLAN_LABELS[plan]}</span>; }

interface TenantTableProps { tenants?: Tenant[]; isLoading?: boolean; error?: boolean; }

const COLUMNS = ['Sucursal', 'Plan', 'Estado', 'Ingresos / mes', 'Pedidos', 'Rating', ''];

export function TenantTable({ tenants, isLoading = false, error = false }: TenantTableProps) {
  return (
    <section className="card" aria-labelledby="tenants-title">
      <div className="flex items-center justify-between border-b border-maison-border px-5 py-3.5">
        <div><h2 id="tenants-title" className="text-sm font-medium text-maison-cream">Sucursales Recientes</h2><p className="text-2xs text-maison-cream-dim mt-0.5">Últimas sucursales registradas</p></div>
        <a href="/sucursales" className="text-2xs font-medium text-maison-amber hover:text-maison-amber-light transition-colors">Ver todos →</a>
      </div>
      {isLoading && <div aria-hidden="true"><div className="border-b border-maison-border bg-surface-2 px-4 py-2.5"><div className="flex gap-4">{[1,.5,.5,.6,.4,.3,.2].map((flex, i) => <Skeleton key={i} className="h-2.5" style={{ flex }} />)}</div></div>{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)}</div>}
      {!isLoading && (error || !tenants?.length) && <EmptyState icon={<IconTenants className="h-6 w-6" />} title="Sin sucursales registradas" description="Las sucursales aparecerán aquí cuando el API esté disponible." className="py-12" />}
      {!isLoading && !error && tenants && tenants.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs" aria-labelledby="tenants-title">
            <thead><tr className="border-b border-maison-border bg-surface-2">{COLUMNS.map((col) => <th key={col} scope="col" className={cn('px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs', ['Ingresos / mes','Pedidos','Rating'].includes(col) && 'text-right')}>{col}</th>)}</tr></thead>
            <tbody>{tenants.map((t) => (
              <tr key={t.id} className="border-b border-maison-border last:border-b-0 hover:bg-surface-2 transition-colors">
                <td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-[11px] font-semibold text-white" style={{ background: 'linear-gradient(140deg, #2E2A22 0%, #5C5850 100%)' }} aria-hidden="true">{getInitials(t.name)}</div><div className="min-w-0"><p className="font-medium text-maison-cream truncate max-w-[140px]">{t.name}</p><p className="text-2xs text-maison-cream-dim">{t.ownerEmail}</p></div></div></td>
                <td className="px-4 py-3"><PlanBadge plan={t.plan} /></td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3 text-right font-mono text-maison-cream tabular-nums">{formatCurrency(t.monthlyRevenue)}</td>
                <td className="px-4 py-3 text-right font-mono text-maison-cream-muted tabular-nums">{t.monthlyOrders.toLocaleString('es-MX')}</td>
                <td className="px-4 py-3 text-right font-mono text-maison-gold tabular-nums">★ {t.avgRating.toFixed(1)}</td>
                <td className="px-4 py-3"><a href={`/sucursales/${t.id}`} className="flex items-center justify-end text-maison-cream-dim hover:text-maison-amber transition-colors" aria-label={`Ver detalle de ${t.name}`}><IconExternalLink className="h-3.5 w-3.5" /></a></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
