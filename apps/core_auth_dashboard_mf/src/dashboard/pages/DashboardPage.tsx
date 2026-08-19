import { IconDollarSign, IconPlus, IconStar, IconTenants, IconUsers, StatCard, StatCardSkeleton } from '@maison/ui';
import { useState } from 'react';
import { BranchModal } from '../components/branches/BranchModal';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { RevenueChartSection } from '../components/dashboard/RevenueChartSection';
import { TenantTable } from '../components/dashboard/TenantTable';
import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency, formatNumber, formatPercent } from '../utils';

export default function DashboardPage() {
  const { data, isLoading, error, refresh } = useDashboard();
  const [modalOpen, setModalOpen] = useState(false);
  const stats = data?.stats;
  const hasError = !!error;
  return (
    <div className="flex flex-col gap-7 animate-fade-in">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">Dashboard</h1>
          <p className="mt-1.5 text-sm text-maison-cream-muted">Vista general de la plataforma</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded border border-maison-amber bg-maison-amber-glow px-4 py-2 text-sm font-medium text-maison-amber transition-colors hover:bg-maison-amber hover:text-surface-0 self-start sm:self-auto">
          <IconPlus className="h-4 w-4" />Nueva Sucursal
        </button>
      </header>
      <section aria-labelledby="kpi-title">
        <h2 id="kpi-title" className="sr-only">Métricas principales</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading ? (
            <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
          ) : (
            <>
              <StatCard label="Total Sucursales" value={stats ? formatNumber(stats.totalTenants) : '—'} delta={stats ? `+${stats.newTenantsThisMonth} este mes` : undefined} deltaPositive icon={<IconTenants className="h-3.5 w-3.5" />} colorVariant="cream" />
              <StatCard label="Usuarios Activos" value={stats ? formatNumber(stats.activeUsers) : '—'} delta={stats ? `${formatNumber(stats.totalUsers)} total` : undefined} deltaPositive deltaLabel="usuarios registrados" icon={<IconUsers className="h-3.5 w-3.5" />} colorVariant="sage" />
              <StatCard label="Ingresos del Mes" value={stats ? formatCurrency(stats.monthlyRevenue) : '—'} delta={stats ? formatPercent(stats.revenueGrowth) : undefined} deltaPositive={stats ? stats.revenueGrowth >= 0 : true} icon={<IconDollarSign className="h-3.5 w-3.5" />} colorVariant="amber" />
              <StatCard label="Rating Promedio" value={stats ? `★ ${stats.avgRating.toFixed(1)}` : '—'} icon={<IconStar className="h-3.5 w-3.5" />} colorVariant="gold" />
            </>
          )}
        </div>
      </section>
      {!isLoading && stats?.planUsage && (
        <PlanUsagePanel plan={stats.plan} planUsage={stats.planUsage} />
      )}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <RevenueChartSection data={data?.revenue} isLoading={isLoading} error={hasError} />
        <ActivityFeed items={data?.activity} isLoading={isLoading} error={hasError} />
      </div>
      <TenantTable tenants={data?.branches} isLoading={isLoading} error={hasError} />

      <BranchModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={refresh} />
    </div>
  );
}

function PlanUsagePanel({
  plan,
  planUsage,
}: {
  plan: string;
  planUsage: DashboardStats['planUsage'];
}) {
  const resources = [
    ['Sucursales', planUsage.usage.branches, planUsage.limits.branches],
    ['Elementos de menú', planUsage.usage.menuItems, planUsage.limits.menuItems],
    ['Staff', planUsage.usage.staff, planUsage.limits.staff],
  ] as const;

  return (
    <section className="rounded border border-maison-border bg-surface-1 px-5 py-4" aria-labelledby="plan-usage-title">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="plan-usage-title" className="text-sm font-medium text-maison-cream">Uso del plan {plan}</h2>
          <p className="text-xs text-maison-cream-muted">Límites actuales de tu suscripción</p>
        </div>
        <span className="text-xs font-medium text-maison-amber">{plan}</span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {resources.map(([label, used, limit]) => {
          const percentage = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100));
          return (
            <div key={label}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-maison-cream-muted">{label}</span>
                <span className="font-mono text-maison-cream">{used}/{limit === null ? '∞' : limit}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-maison-amber" style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
