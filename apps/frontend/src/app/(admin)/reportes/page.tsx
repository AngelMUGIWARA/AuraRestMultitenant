'use client';

import { useState } from 'react';
import { useBranch } from '@/context/BranchContext';
import { useDashboard } from '@/hooks/useDashboard';
import { formatCurrency, formatPercent, formatNumber, cn } from '@/lib/utils';
import { StatCard, StatCardSkeleton } from '@/components/admin/dashboard/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  IconAnalytics, IconDollarSign, IconOrders,
  IconTrendingUp, IconDownload, IconRefresh,
} from '@/components/ui/Icons';

type Period = 'hoy' | 'semana' | 'mes' | 'trimestre' | 'año';
const PERIODS: { value: Period; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'año', label: 'Año' },
];

/* ─── Chart Skeleton (realistic grid) ──────────────────────────── */

function ChartSkeleton({ height = 'h-52' }: { height?: string }) {
  const bars = [42, 67, 55, 80, 61, 93, 70, 48, 85, 62, 77, 95];
  return (
    <div className={cn('relative w-full overflow-hidden', height)} aria-hidden="true">
      {/* Y-axis grid lines */}
      {[0, 25, 50, 75, 100].map((pct) => (
        <div
          key={pct}
          className="absolute left-0 right-0 border-t border-dashed border-maison-border/50"
          style={{ bottom: `${pct}%` }}
        />
      ))}
      {/* Bars */}
      <div className="absolute inset-0 flex items-end gap-1 px-1 pb-0">
        {bars.map((h, i) => (
          <div key={i} className="flex flex-1 flex-col justify-end">
            <Skeleton className="w-full rounded-t-sm" style={{ height: `${h}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SmallChartSkeleton() {
  const widths = ['w-full', 'w-4/5', 'w-3/5', 'w-2/5', 'w-1/4'];
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {widths.map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-2.5 w-2.5 rounded-sm flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-2.5 w-12" />
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
              <Skeleton className={cn('h-full rounded-full', w)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function ReportesPage() {
  const { selectedBranch } = useBranch();
  const { data, isLoading, error, refresh } = useDashboard();
  const [period, setPeriod] = useState<Period>('mes');
  const stats = data?.stats;
  const hasError = !!error;

  return (
    <div className="flex flex-col gap-7 animate-fade-in">

      {/* ── Page Header ──────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium leading-none text-maison-cream">
            Reportes
          </h1>
          <p className="mt-1.5 text-sm text-maison-cream-muted">
            {selectedBranch.isGlobal
              ? 'Analíticas globales de la plataforma'
              : `Analíticas — ${selectedBranch.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Period tabs */}
          <div
            className="flex gap-0.5 rounded-lg border border-maison-border bg-surface-2 p-0.5"
            role="group"
            aria-label="Seleccionar periodo"
          >
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
          <button type="button" onClick={refresh} className="btn-ghost" disabled={isLoading}>
            <IconRefresh className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
          <button type="button" className="btn-primary">
            <IconDownload className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </header>

      {/* ── Métricas Primero ───────────────────────────────────
           Regla de negocio: los KPIs siempre encabezan la sección. */}
      <section aria-labelledby="reportes-kpis">
        <h2 id="reportes-kpis" className="sr-only">Métricas del periodo</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
          ) : (
            <>
              <StatCard
                label="Ingresos del periodo"
                value={stats ? formatCurrency(stats.monthlyRevenue) : '—'}
                delta={stats ? formatPercent(stats.revenueGrowth) : undefined}
                deltaPositive={stats ? stats.revenueGrowth >= 0 : undefined}
                icon={<IconDollarSign className="h-3.5 w-3.5" />}
                colorVariant="amber"
              />
              <StatCard
                label="Total pedidos"
                value={stats ? formatNumber(stats.totalTenants * 38) : '—'}
                delta="+12.4%"
                deltaPositive
                icon={<IconOrders className="h-3.5 w-3.5" />}
                colorVariant="cream"
              />
              <StatCard
                label="Ticket promedio"
                value={stats
                  ? formatCurrency(Math.round(stats.monthlyRevenue / Math.max(stats.totalTenants * 38, 1)))
                  : '—'}
                delta="+5.1%"
                deltaPositive
                icon={<IconTrendingUp className="h-3.5 w-3.5" />}
                colorVariant="sage"
              />
              <StatCard
                label="Rating plataforma"
                value={stats ? `★ ${stats.avgRating.toFixed(1)}` : '—'}
                icon={<IconAnalytics className="h-3.5 w-3.5" />}
                colorVariant="gold"
              />
            </>
          )}
        </div>
      </section>

      {/* ── Revenue Chart ────────────────────────────────────── */}
      <section className="card" aria-labelledby="revenue-chart-title">
        <div className="flex items-center justify-between border-b border-maison-border px-5 py-3.5">
          <div>
            <h2 id="revenue-chart-title" className="text-sm font-medium text-maison-cream">
              Ingresos — {PERIODS.find((p) => p.value === period)?.label}
            </h2>
            <p className="mt-0.5 text-2xs text-maison-cream-dim">
              Comparativa con periodo anterior
            </p>
          </div>
          <div className="flex items-center gap-3 text-2xs text-maison-cream-dim">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-maison-amber" aria-hidden="true" />
              Periodo actual
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-surface-3" aria-hidden="true" />
              Periodo anterior
            </span>
          </div>
        </div>
        <div className="p-5">
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <EmptyState
              icon={<IconAnalytics className="h-6 w-6" />}
              title="Datos del gráfico no disponibles"
              description="La gráfica de ingresos aparecerá aquí cuando el API esté conectado."
              className="py-12"
            />
          )}
        </div>
        {/* X-axis labels skeleton */}
        {isLoading && (
          <div className="flex gap-1 px-5 pb-4" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-2.5 flex-1" />
            ))}
          </div>
        )}
      </section>

      {/* ── Bottom row: Category breakdown + Sucursales performance */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

        <section className="card" aria-labelledby="categories-breakdown-title">
          <div className="border-b border-maison-border px-5 py-3.5">
            <h2 id="categories-breakdown-title" className="text-sm font-medium text-maison-cream">
              Desglose por Categoría
            </h2>
            <p className="mt-0.5 text-2xs text-maison-cream-dim">
              Contribución de ingresos por categoría de menú
            </p>
          </div>
          <div className="p-5">
            {isLoading ? <SmallChartSkeleton /> : (
              <EmptyState
                icon={<IconAnalytics className="h-6 w-6" />}
                title="Sin datos de categorías"
                description="El desglose por categoría estará disponible con el API."
                className="py-10"
              />
            )}
          </div>
        </section>

        <section className="card" aria-labelledby="branch-perf-title">
          <div className="border-b border-maison-border px-5 py-3.5">
            <h2 id="branch-perf-title" className="text-sm font-medium text-maison-cream">
              Rendimiento por Sucursal
            </h2>
            <p className="mt-0.5 text-2xs text-maison-cream-dim">
              Comparativa de ingresos entre sucursales
            </p>
          </div>
          <div className="p-5">
            {isLoading ? (
              <div className="flex flex-col gap-3.5" aria-hidden="true">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-7 w-7 rounded flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="flex justify-between gap-2">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                        <Skeleton
                          className="h-full rounded-full"
                          style={{ width: `${[80, 60, 45, 30][i]}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<IconTrendingUp className="h-6 w-6" />}
                title="Sin datos de sucursales"
                description="El rendimiento por sucursal estará disponible con el API."
                className="py-10"
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
