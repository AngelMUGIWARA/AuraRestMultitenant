'use client';

import type { StockAlert } from '@maison/types';
import { EmptyState, IconAlertTriangle } from '@maison/ui';
import { formatQty } from './inventory-meta';

interface AlertsPanelProps {
  alerts: StockAlert[];
}

/** Tarjetas de reabastecimiento: insumos bajo su mínimo configurado */
export function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={<IconAlertTriangle className="h-6 w-6" />}
        title="Despensa saludable"
        description="Ningún insumo está por debajo de su stock mínimo."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {alerts.map((alert, idx) => (
        <article
          key={`${alert.itemId}-${alert.branchId}`}
          className="card animate-slide-in-up border-l-2 border-l-maison-ruby p-4"
          style={{ animationDelay: `${idx * 45}ms`, animationFillMode: 'backwards' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-maison-cream">{alert.itemName}</p>
              <p className="mt-0.5 text-2xs uppercase tracking-wider text-maison-cream-dim">
                {alert.branchName}
              </p>
            </div>
            <span className="badge bg-maison-ruby-bg text-maison-ruby animate-pulse-soft">
              Reabastecer
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between font-mono tabular-nums">
            <span className="text-lg font-medium text-maison-ruby">
              {formatQty(alert.quantity, alert.unit)}
            </span>
            <span className="text-2xs text-maison-cream-dim">
              mín {formatQty(alert.minStock)} · faltan {formatQty(alert.deficit)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
