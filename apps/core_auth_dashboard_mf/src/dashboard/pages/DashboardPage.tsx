import { useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency, formatNumber, formatPercent } from '../utils';
import { StatCard, StatCardSkeleton, IconTenants, IconUsers, IconDollarSign, IconStar, IconPlus } from '@maison/ui';
import { RevenueChartSection } from '../components/dashboard/RevenueChartSection';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { TenantTable } from '../components/dashboard/TenantTable';
import { BranchModal } from '../components/branches/BranchModal';

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
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <RevenueChartSection data={data?.revenue} isLoading={isLoading} error={hasError} />
        <ActivityFeed items={data?.activity} isLoading={isLoading} error={hasError} />
      </div>
      <TenantTable tenants={data?.branches} isLoading={isLoading} error={hasError} />

      <BranchModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={refresh} />
    </div>
  );
}
