'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@maison/ui';
import { EmptyState } from '@maison/ui';
import { IconAnalytics } from '@maison/ui';
import type { RevenueDataPoint } from '@maison/types';

type Period = 'weekly' | 'monthly' | 'yearly';

const PERIOD_LABELS: Record<Period, string> = {
  weekly: 'Semana',
  monthly: 'Mes',
  yearly: 'Año',
};

interface RevenueChartSectionProps {
  data?: RevenueDataPoint[];
  isLoading?: boolean;
  error?: boolean;
}

export function RevenueChartSection({
  data,
  isLoading = false,
  error = false,
}: RevenueChartSectionProps) {
  const [period, setPeriod] = useState<Period>('monthly');

  return (
    <section className="card flex flex-col" aria-labelledby="revenue-title">
      <div className="flex items-center justify-between border-b border-maison-border px-5 py-3.5">
        <div>
          <h2 id="revenue-title" className="text-sm font-medium text-maison-cream">
            Ingresos
          </h2>
          <p className="text-2xs text-maison-cream-dim mt-0.5">
            Evolución por periodo
          </p>
        </div>

        <div
          className="flex gap-0.5 rounded bg-surface-2 p-0.5"
          role="group"
          aria-label="Seleccionar periodo"
        >
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                period === p
                  ? 'bg-surface-1 text-maison-cream shadow-card'
                  : 'text-maison-cream-dim hover:text-maison-cream',
              )}
              aria-pressed={period === p}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-5">
        {isLoading && <ChartSkeleton />}
        {!isLoading && (error || !data?.length) && (
          <EmptyState
            icon={<IconAnalytics className="h-6 w-6" />}
            title="Sin datos de ingresos"
            description="Los datos aparecerán aquí cuando el API esté disponible."
            className="py-10"
          />
        )}
        {!isLoading && !error && data && data.length > 0 && (
          <BarChart data={data} />
        )}
      </div>
    </section>
  );
}

function ChartSkeleton() {
  const bars = [65, 40, 80, 55, 90, 70, 45, 85, 60, 75, 50, 95];
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="flex items-end gap-1.5 h-48 px-1">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <Skeleton
              className="w-full rounded-sm"
              style={{ height: `${h}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
    </div>
  );
}

function BarChart({ data }: { data: RevenueDataPoint[] }) {
  const max = Math.max(...data.map((d) => d.revenue));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-1.5 h-48 px-1">
        {data.map((point) => {
          const height = max > 0 ? (point.revenue / max) * 100 : 0;
          return (
            <div
              key={point.month}
              className="flex-1 flex flex-col justify-end group cursor-pointer"
              title={`${point.month}: $${point.revenue.toLocaleString('es-MX')}`}
            >
              <div
                className="w-full rounded-sm bg-maison-amber-dim group-hover:bg-maison-amber transition-colors"
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        {data.map((point) => (
          <p
            key={point.month}
            className="flex-1 text-center font-mono text-2xs text-maison-cream-dim"
          >
            {point.month}
          </p>
        ))}
      </div>
    </div>
  );
}
