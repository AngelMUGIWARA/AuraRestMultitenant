'use client';

import type { Metadata } from 'next';
import { useState } from 'react';
import { useBranch } from '@/context/BranchContext';
import { useInventory } from '@/hooks/useInventory';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
import { STOCK_STATUS_LABELS } from '@/lib/constants';
import { StatCard, StatCardSkeleton } from '@/components/admin/dashboard/StatCard';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  IconInventory, IconAlertTriangle, IconAlertCircle,
  IconDollarSign, IconSearch, IconFilter, IconPlus,
  IconRefresh, IconPackage,
} from '@/components/ui/Icons';
import type { InventoryItem, StockStatus, InventoryFilters } from '@/types/inventory.types';

/* ─── Status config ─────────────────────────────────────────────── */

const STATUS_BADGE: Record<StockStatus, string> = {
  ok: 'badge-active',
  low: 'badge bg-maison-gold-bg text-maison-gold',
  critical: 'badge bg-maison-amber-glow text-maison-amber',
  out_of_stock: 'badge-suspended',
};

const STATUS_FILTERS: { value: StockStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'ok', label: 'Normal' },
  { value: 'low', label: 'Bajo' },
  { value: 'critical', label: 'Crítico' },
  { value: 'out_of_stock', label: 'Sin Stock' },
];

/* ─── Sub-components ────────────────────────────────────────────── */

function StockBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const colorClass =
    pct < 10
      ? 'bg-maison-ruby'
      : pct < 30
        ? 'bg-maison-amber'
        : 'bg-maison-sage';

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs tabular-nums text-maison-cream">{current}</span>
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-3">
        <div className={cn('h-full rounded-full transition-all', colorClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function InventoryTableSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="border-b border-maison-border bg-surface-2 px-4 py-2.5">
        <div className="flex gap-3">
          {[0.3, 1, 0.5, 0.5, 0.4, 0.4, 0.2].map((f, i) => (
            <Skeleton key={i} className="h-2.5" style={{ flex: f }} />
          ))}
        </div>
      </div>
      {Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} cols={7} />)}
    </div>
  );
}

function AlertsSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 p-4" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-maison-border bg-surface-2 p-3">
          <Skeleton className="h-7 w-7 rounded flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertItem({ item }: { item: InventoryItem }) {
  const isCritical = item.status === 'critical' || item.status === 'out_of_stock';
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
        isCritical
          ? 'border-maison-ruby/30 bg-maison-ruby-bg'
          : 'border-maison-gold/30 bg-maison-gold-bg',
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded',
          isCritical ? 'text-maison-ruby' : 'text-maison-gold',
        )}
        aria-hidden="true"
      >
        {isCritical ? <IconAlertCircle className="h-4 w-4" /> : <IconAlertTriangle className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-maison-cream">{item.name}</p>
        <p className="text-2xs text-maison-cream-muted mt-0.5">{item.categoryName}</p>
        <p className={cn('text-2xs mt-1 font-medium', isCritical ? 'text-maison-ruby' : 'text-maison-gold')}>
          {item.currentStock} {item.unit} restantes
        </p>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */

export default function InventarioPage() {
  const { selectedBranch } = useBranch();
  const { stats, items, isLoading, error, filters, setFilters, refresh } = useInventory(
    selectedBranch.id,
  );
  const [activeStatus, setActiveStatus] = useState<StockStatus | 'all'>('all');
  const hasError = !!error;

  const alertItems = items?.data?.filter(
    (i) => i.status === 'critical' || i.status === 'out_of_stock' || i.status === 'low',
  ) ?? [];

  function handleStatusFilter(val: StockStatus | 'all') {
    setActiveStatus(val);
    setFilters({ status: val === 'all' ? undefined : val });
  }

  return (
    <div className="flex flex-col gap-7 animate-fade-in">
      {/* ── Page Header ──────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">
            Inventario
          </h1>
          <p className="mt-1.5 text-sm text-maison-cream-muted">
            {selectedBranch.isGlobal
              ? 'Control de stock — Todas las sucursales'
              : `Control de stock — ${selectedBranch.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={refresh}
            className="btn-ghost"
            aria-label="Actualizar datos"
            disabled={isLoading}
          >
            <IconRefresh className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Actualizar
          </button>
          <button type="button" className="btn-primary">
            <IconPlus className="h-4 w-4" />
            Agregar producto
          </button>
        </div>
      </header>

      {/* ── Métricas (SIEMPRE PRIMERO) ────────────────────────
           Regla de negocio crítica: los KPIs deben aparecer en la
           parte superior antes que cualquier tabla o detalle.       */}
      <section aria-labelledby="inventory-kpis">
        <h2 id="inventory-kpis" className="sr-only">Métricas de inventario</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                label="Total Productos"
                value={stats ? formatNumber(stats.totalProducts) : '—'}
                delta={stats ? `${formatNumber(stats.totalActive)} activos` : undefined}
                deltaPositive
                deltaLabel=""
                icon={<IconInventory className="h-3.5 w-3.5" />}
                colorVariant="cream"
              />
              <StatCard
                label="Stock Bajo"
                value={stats ? formatNumber(stats.lowStockItems) : '—'}
                delta={stats ? `${formatNumber(stats.criticalItems)} críticos` : undefined}
                deltaPositive={false}
                deltaLabel=""
                icon={<IconAlertTriangle className="h-3.5 w-3.5" />}
                colorVariant="gold"
              />
              <StatCard
                label="Sin Stock"
                value={stats ? formatNumber(stats.outOfStockItems) : '—'}
                icon={<IconAlertCircle className="h-3.5 w-3.5" />}
                colorVariant="amber"
              />
              <StatCard
                label="Valor Total"
                value={stats ? formatCurrency(stats.totalInventoryValue) : '—'}
                icon={<IconDollarSign className="h-3.5 w-3.5" />}
                colorVariant="sage"
              />
            </>
          )}
        </div>
      </section>

      {/* ── Filter Bar ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative max-w-xs flex-1">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-maison-cream-dim" />
          <input
            type="search"
            placeholder="Buscar producto o SKU..."
            value={filters.search ?? ''}
            onChange={(e) => setFilters({ search: e.target.value || undefined })}
            className="input-base w-full pl-8"
            aria-label="Buscar en inventario"
          />
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => handleStatusFilter(f.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                activeStatus === f.value
                  ? 'border-maison-amber bg-maison-amber-glow text-maison-amber'
                  : 'border-maison-border bg-surface-1 text-maison-cream-muted hover:bg-surface-2 hover:text-maison-cream',
              )}
              aria-pressed={activeStatus === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content: Table + Alerts ─────────────────────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">

        {/* Inventory Table */}
        <section className="card overflow-hidden" aria-labelledby="inventory-table-title">
          <div className="flex items-center justify-between border-b border-maison-border px-5 py-3.5">
            <div>
              <h2 id="inventory-table-title" className="text-sm font-medium text-maison-cream">
                Productos en inventario
              </h2>
              {!isLoading && items && (
                <p className="mt-0.5 text-2xs text-maison-cream-dim">
                  {formatNumber(items.meta.total)} productos encontrados
                </p>
              )}
            </div>
            <button type="button" className="btn-ghost text-xs py-1 px-2">
              <IconFilter className="h-3.5 w-3.5" />
              Columnas
            </button>
          </div>

          {isLoading && <InventoryTableSkeleton />}

          {!isLoading && (hasError || !items?.data?.length) && (
            <EmptyState
              icon={<IconPackage className="h-6 w-6" />}
              title={hasError ? 'Error al cargar inventario' : 'Sin productos'}
              description={
                hasError
                  ? 'No se pudo conectar al API. Verifica la conexión.'
                  : 'No hay productos que coincidan con los filtros aplicados.'
              }
              className="py-16"
            />
          )}

          {!isLoading && !hasError && items?.data && items.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" aria-labelledby="inventory-table-title">
                <thead>
                  <tr className="border-b border-maison-border bg-surface-2">
                    {['SKU', 'Producto', 'Categoría', 'Stock', 'Estado', 'Costo unit.', 'Valor total'].map(
                      (col) => (
                        <th
                          key={col}
                          scope="col"
                          className={cn(
                            'px-4 py-2.5 text-left text-2xs font-medium uppercase tracking-widest text-maison-cream-dim whitespace-nowrap',
                            (col === 'Costo unit.' || col === 'Valor total') && 'text-right',
                          )}
                        >
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.data.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-maison-border last:border-b-0 hover:bg-surface-2 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-maison-cream-muted text-2xs whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="px-4 py-3 font-medium text-maison-cream max-w-[160px] truncate">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-maison-cream-muted whitespace-nowrap">
                        {item.categoryName}
                      </td>
                      <td className="px-4 py-3">
                        <StockBar current={item.currentStock} max={item.maxStock} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('badge', STATUS_BADGE[item.status])}>
                          <span className="h-1 w-1 rounded-full bg-current" />
                          {STOCK_STATUS_LABELS[item.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-maison-cream-muted">
                        {formatCurrency(item.unitCost)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-maison-cream">
                        {formatCurrency(item.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Stock Alerts Sidebar */}
        <section className="card" aria-labelledby="alerts-title">
          <div className="flex items-center justify-between border-b border-maison-border px-5 py-3.5">
            <div>
              <h2 id="alerts-title" className="text-sm font-medium text-maison-cream">
                Alertas de Stock
              </h2>
              <p className="mt-0.5 text-2xs text-maison-cream-dim">
                Productos que requieren atención
              </p>
            </div>
            {!isLoading && alertItems.length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-maison-ruby-bg px-1.5 text-2xs font-medium text-maison-ruby">
                {alertItems.length}
              </span>
            )}
          </div>

          {isLoading && <AlertsSkeleton />}

          {!isLoading && alertItems.length === 0 && (
            <EmptyState
              icon={<IconInventory className="h-6 w-6" />}
              title="Todo en orden"
              description="No hay productos con niveles críticos de stock."
              className="py-12"
            />
          )}

          {!isLoading && alertItems.length > 0 && (
            <ul role="list" className="flex flex-col gap-2.5 p-4">
              {alertItems.map((item) => (
                <li key={item.id}>
                  <AlertItem item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
