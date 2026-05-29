'use client';

import { useState } from 'react';
import { useBranch } from '@/context/BranchContext';
import { useInventory } from '@/hooks/useInventory';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
import { STOCK_STATUS_LABELS } from '@/lib/constants';
import { StatCard, StatCardSkeleton } from '@/components/admin/dashboard/StatCard';
import { Skeleton, SkeletonAvatar } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  IconInventory, IconAlertTriangle, IconAlertCircle,
  IconDollarSign, IconSearch, IconPlus, IconRefresh, IconPackage,
} from '@/components/ui/Icons';
import type { InventoryItem, StockStatus } from '@/types/inventory.types';

/* ─── Config ────────────────────────────────────────────────────── */

const STATUS_BADGE: Record<StockStatus, string> = {
  ok: 'badge-active',
  low: 'badge bg-maison-gold-bg text-maison-gold',
  critical: 'badge bg-maison-amber-glow text-maison-amber',
  out_of_stock: 'badge-suspended',
};

const STATUS_FILTERS: { value: StockStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'ok', label: 'Normal' },
  { value: 'low', label: 'Stock bajo' },
  { value: 'critical', label: 'Crítico' },
  { value: 'out_of_stock', label: 'Sin stock' },
];

/* ─── Stock bar ─────────────────────────────────────────────────── */

function StockBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const color =
    pct < 10 ? 'bg-maison-ruby' : pct < 30 ? 'bg-maison-amber' : 'bg-maison-sage';
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-right font-mono text-xs tabular-nums text-maison-cream">
        {current}
      </span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── Skeletons ─────────────────────────────────────────────────── */

function TableSkeleton() {
  return (
    <div aria-hidden="true">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-maison-border bg-surface-2 px-4 py-2.5">
        {[0.3, 1, 0.5, 0.5, 0.4, 0.4, 0.2].map((f, i) => (
          <Skeleton key={i} className="h-2.5" style={{ flex: f }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-maison-border px-4 py-3.5 last:border-b-0"
        >
          <Skeleton className="h-3 w-14" /> {/* SKU */}
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <Skeleton className="h-3 w-20" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-1.5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

function AlertsSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 p-4" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-lg border border-maison-border bg-surface-2 p-3"
        >
          <SkeletonAvatar size="sm" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Alert item ────────────────────────────────────────────────── */

function AlertItem({ item }: { item: InventoryItem }) {
  const isCritical = item.status === 'critical' || item.status === 'out_of_stock';
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 transition-colors hover:brightness-105',
        isCritical
          ? 'border-maison-ruby/20 bg-maison-ruby-bg'
          : 'border-maison-gold/20 bg-maison-gold-bg',
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
        <p className="mt-0.5 truncate text-2xs text-maison-cream-muted">{item.categoryName}</p>
        <p
          className={cn(
            'mt-1 text-2xs font-semibold',
            isCritical ? 'text-maison-ruby' : 'text-maison-gold',
          )}
        >
          {item.currentStock} {item.unit} restantes
        </p>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

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
          <h1 className="font-display text-3xl font-medium leading-none text-maison-cream">
            Inventario
          </h1>
          <p className="mt-1.5 text-sm text-maison-cream-muted">
            {selectedBranch.isGlobal
              ? 'Control de stock — Todas las sucursales'
              : `Control de stock — ${selectedBranch.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button type="button" onClick={refresh} className="btn-ghost" disabled={isLoading}>
            <IconRefresh className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Actualizar
          </button>
          <button type="button" className="btn-primary">
            <IconPlus className="h-4 w-4" />
            Agregar producto
          </button>
        </div>
      </header>

      {/* ── Métricas Primero ───────────────────────────────────
           KPIs obligatoriamente en la parte superior de cada módulo. */}
      <section aria-labelledby="inv-kpis">
        <h2 id="inv-kpis" className="sr-only">Métricas de inventario</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
          ) : (
            <>
              <StatCard
                label="Total productos"
                value={stats ? formatNumber(stats.totalProducts) : '—'}
                delta={stats ? `${formatNumber(stats.totalActive)} activos` : undefined}
                deltaPositive
                deltaLabel=""
                icon={<IconInventory className="h-3.5 w-3.5" />}
                colorVariant="cream"
              />
              <StatCard
                label="Stock bajo"
                value={stats ? formatNumber(stats.lowStockItems) : '—'}
                delta={stats?.criticalItems ? `${formatNumber(stats.criticalItems)} críticos` : undefined}
                deltaPositive={false}
                deltaLabel=""
                icon={<IconAlertTriangle className="h-3.5 w-3.5" />}
                colorVariant="gold"
              />
              <StatCard
                label="Sin stock"
                value={stats ? formatNumber(stats.outOfStockItems) : '—'}
                icon={<IconAlertCircle className="h-3.5 w-3.5" />}
                colorVariant="amber"
              />
              <StatCard
                label="Valor total"
                value={stats ? formatCurrency(stats.totalInventoryValue) : '—'}
                icon={<IconDollarSign className="h-3.5 w-3.5" />}
                colorVariant="sage"
              />
            </>
          )}
        </div>
      </section>

      {/* ── Filter bar ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

      {/* ── Main: Table + Alerts ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_296px]">

        {/* Inventory table */}
        <section className="card overflow-hidden" aria-labelledby="inv-table-title">
          <div className="flex items-center justify-between border-b border-maison-border px-5 py-3.5">
            <div>
              <h2 id="inv-table-title" className="text-sm font-medium text-maison-cream">
                Productos
              </h2>
              {!isLoading && items && (
                <p className="mt-0.5 text-2xs text-maison-cream-dim">
                  {formatNumber(items.meta.total)} productos encontrados
                </p>
              )}
            </div>
          </div>

          {isLoading && <TableSkeleton />}

          {!isLoading && (hasError || !items?.data?.length) && (
            <EmptyState
              icon={<IconPackage className="h-6 w-6" />}
              title={hasError ? 'No se pudo cargar el inventario' : 'Sin productos'}
              description={
                hasError
                  ? 'Verifica la conexión con el API del servidor.'
                  : 'No hay productos que coincidan con los filtros aplicados.'
              }
              className="py-16"
            />
          )}

          {!isLoading && !hasError && items?.data && items.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" aria-labelledby="inv-table-title">
                <thead>
                  <tr className="border-b border-maison-border bg-surface-2">
                    {['SKU', 'Producto', 'Categoría', 'Stock', 'Estado', 'Costo unit.', 'Valor total'].map(
                      (col) => (
                        <th
                          key={col}
                          scope="col"
                          className={cn(
                            'whitespace-nowrap px-4 py-2.5 text-left text-2xs font-medium uppercase tracking-widest text-maison-cream-dim',
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
                      className="border-b border-maison-border last:border-b-0 transition-colors hover:bg-surface-2"
                    >
                      <td className="px-4 py-3 font-mono text-2xs text-maison-cream-muted">
                        {item.sku}
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 font-medium text-maison-cream">
                        {item.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-maison-cream-muted">
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

        {/* Stock alerts sidebar */}
        <section className="card" aria-labelledby="alerts-title">
          <div className="flex items-center justify-between border-b border-maison-border px-5 py-3.5">
            <div>
              <h2 id="alerts-title" className="text-sm font-medium text-maison-cream">
                Alertas de Stock
              </h2>
              <p className="mt-0.5 text-2xs text-maison-cream-dim">
                Requieren atención inmediata
              </p>
            </div>
            {!isLoading && alertItems.length > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-maison-ruby-bg px-1.5 text-2xs font-semibold text-maison-ruby">
                {alertItems.length}
              </span>
            )}
          </div>

          {isLoading && <AlertsSkeleton />}

          {!isLoading && alertItems.length === 0 && (
            <EmptyState
              icon={<IconInventory className="h-5 w-5" />}
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
