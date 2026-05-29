'use client';

import { useState } from 'react';
import { useBranch } from '@/context/BranchContext';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import { StatCard, StatCardSkeleton } from '@/components/admin/dashboard/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconAnalytics, IconDollarSign, IconOrders, IconTrendingUp, IconDownload } from '@/components/ui/Icons';
import { useDashboard } from '@/hooks/useDashboard';

type Period = 'hoy' | 'semana' | 'mes' | 'trimestre' | 'año';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'año', label: 'Año' },
];

export default function ReportesPage() {
  const { selectedBranch } = useBranch();
  const { data, isLoading, error } = useDashboard();
  const [period, setPeriod] = useState<Period>('mes');
  const stats = data?.stats;
  const hasError = !!error;

  return (
    <div className="flex flex-col gap-7 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">Reportes</h1>
          <p className="mt-1.5 text-sm text-maison-cream-muted">
            {selectedBranch.isGlobal ? 'Analíticas globales' : `Analíticas — ${selectedBranch.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Period selector */}
          <div className="flex gap-0.5 rounded-lg border border-maison-border bg-surface-2 p-0.5" role="group" aria-label="Periodo">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  period === p.value
                    ? 'bg-surface-1 text-maison-cream shadow-card'
                    : 'text-maison-cream-dim hover:text-maison-cream',
                )}
                aria-pressed={period === p.value}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn-ghost">
            <IconDownload className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </header>

      {/* ── Métricas Primero ──────────────────────────────────── */}
      <section aria-labelledby="report-kpis">
        <h2 id="report-kpis" className="sr-only">Métricas de reportes</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
          ) : (
            <>
              <StatCard
                label="Ingresos del periodo"
                value={stats ? formatCurrency(stats.monthlyRevenue) : '—'}
                delta={stats ? formatPercent(stats.revenueGrowth) : undefined}
                deltaPositive={stats ? stats.revenueGrowth >= 0 : true}
                icon={<IconDollarSign className="h-3.5 w-3.5" />}
                colorVariant="amber"
              />
              <StatCard
                label="Total pedidos"
                value={stats ? String(stats.totalTenants * 12) : '—'}
                icon={<IconOrders className="h-3.5 w-3.5" />}
                colorVariant="cream"
              />
              <StatCard
                label="Ticket promedio"
                value={stats ? formatCurrency(stats.monthlyRevenue / Math.max(stats.totalTenants * 12, 1)) : '—'}
                icon={<IconTrendingUp className="h-3.5 w-3.5" />}
                colorVariant="sage"
              />
              <StatCard
                label="Rating promedio"
                value={stats ? `★ ${stats.avgRating.toFixed(1)}` : '—'}
                icon={<IconAnalytics className="h-3.5 w-3.5" />}
                colorVariant="gold"
              />
            </>
          )}
        </div>
      </section>

      {/* Revenue Chart */}
      <section className="card" aria-labelledby="revenue-chart-title">
        <div className="border-b border-maison-border px-5 py-3.5">
          <h2 id="revenue-chart-title" className="text-sm font-medium text-maison-cream">Evolución de Ingresos</h2>
          <p className="mt-0.5 text-2xs text-maison-cream-dim">Comparativa por {period}</p>
        </div>
        <div className="p-5">
          {isLoading ? (
            <div className="flex items-end gap-1.5 h-52" aria-hidden="true">
              {[55, 70, 45, 80, 60, 90, 75, 50, 85, 65, 78, 95].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end">
                  <Skeleton className="w-full rounded-sm" style={{ height: `${h}%` }} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<IconAnalytics className="h-6 w-6" />}
              title="Datos no disponibles"
              description="La gráfica de ingresos aparecerá aquí cuando el API esté conectado."
              className="py-12"
            />
          )}
        </div>
      </section>

      {/* Two-col: Top categories + Performance table */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="card" aria-labelledby="top-categories-title">
          <div className="border-b border-maison-border px-5 py-3.5">
            <h2 id="top-categories-title" className="text-sm font-medium text-maison-cream">Top Categorías</h2>
          </div>
          <div className="p-5">
            {isLoading ? (
              <div className="flex flex-col gap-3" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-3 w-3 rounded" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<IconAnalytics className="h-6 w-6" />}
                title="Sin datos"
                description="Las categorías top aparecerán cuando el API esté disponible."
                className="py-8"
              />
            )}
          </div>
        </section>

        <section className="card" aria-labelledby="performance-title">
          <div className="border-b border-maison-border px-5 py-3.5">
            <h2 id="performance-title" className="text-sm font-medium text-maison-cream">Rendimiento por Sucursal</h2>
          </div>
          <div className="p-5">
            {isLoading ? (
              <div className="flex flex-col gap-3" aria-hidden="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-7 w-7 rounded flex-shrink-0" />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                    <Skeleton className="h-3 w-14" />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<IconTrendingUp className="h-6 w-6" />}
                title="Sin datos"
                description="El rendimiento por sucursal aparecerá cuando el API esté disponible."
                className="py-8"
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
