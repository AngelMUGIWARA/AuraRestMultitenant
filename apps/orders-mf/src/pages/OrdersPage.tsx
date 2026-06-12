import { useState } from 'react';
import { useBranch } from '../context/BranchContext';
import { useOrders } from '../hooks/useOrders';
import { formatCurrency, formatNumber, formatRelativeTime, cn } from '../utils';
import { StatCard, StatCardSkeleton } from '@maison/ui';
import { Skeleton } from '@maison/ui';
import { EmptyState } from '@maison/ui';
import {
  IconOrders, IconDollarSign, IconClock, IconAlertCircle,
  IconRefresh, IconSearch, IconHash, IconUsers,
} from '@maison/ui';
import type { Order, OrderStatus, OrderType } from '@maison/types';

/* ─── Config ────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; badge: string; border: string; dot: string }
> = {
  pending: {
    label: 'Pendiente',
    badge: 'badge bg-maison-gold-bg text-maison-gold',
    border: 'border-maison-gold/20',
    dot: 'bg-maison-gold animate-pulse-soft',
  },
  confirmed: {
    label: 'Confirmado',
    badge: 'badge badge-inactive',
    border: 'border-maison-border',
    dot: 'bg-maison-cream-dim',
  },
  preparing: {
    label: 'En preparación',
    badge: 'badge bg-maison-amber-glow text-maison-amber',
    border: 'border-maison-amber/20',
    dot: 'bg-maison-amber animate-pulse-soft',
  },
  ready: {
    label: 'Listo',
    badge: 'badge-active badge',
    border: 'border-maison-sage/20',
    dot: 'bg-maison-sage',
  },
  delivered: {
    label: 'Entregado',
    badge: 'badge badge-inactive',
    border: 'border-maison-border',
    dot: 'bg-maison-cream-dim',
  },
  cancelled: {
    label: 'Cancelado',
    badge: 'badge-suspended badge',
    border: 'border-maison-ruby/20',
    dot: 'bg-maison-ruby',
  },
};

const TYPE_LABEL: Record<OrderType, string> = {
  dine_in: 'Mesa',
  takeaway: 'Para llevar',
  delivery: 'Domicilio',
};

const STATUS_TABS: { value: OrderStatus | 'active' | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'preparing', label: 'En prep.' },
  { value: 'ready', label: 'Listos' },
  { value: 'delivered', label: 'Entregados' },
];

/* ─── Order card ────────────────────────────────────────────────── */

function OrderCard({ order }: { order: Order }) {
  const cfg = STATUS_CONFIG[order.status];
  const maxItems = 3;
  const shownItems = order.items?.slice(0, maxItems) ?? [];
  const remaining = (order.items?.length ?? order.itemCount ?? 0) - maxItems;

  return (
    <article className={cn('card flex flex-col gap-0 overflow-hidden border-l-2', cfg.border)}>
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-maison-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-maison-cream">
            <IconHash className="h-3 w-3 text-maison-cream-dim" />
            {order.orderNumber}
          </span>
          <span className={cn('badge flex-shrink-0', cfg.badge)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} aria-hidden="true" />
            {cfg.label}
          </span>
        </div>
        <time
          dateTime={order.createdAt}
          className="text-2xs text-maison-cream-dim"
          title={new Date(order.createdAt).toLocaleString('es-MX')}
        >
          {formatRelativeTime(order.createdAt)}
        </time>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Customer */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ background: 'linear-gradient(140deg, rgb(var(--color-accent-dim)) 0%, rgb(var(--color-accent)) 100%)' }}
            aria-hidden="true"
          >
            {order.customerName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-maison-cream">{order.customerName}</p>
            <p className="text-2xs text-maison-cream-dim">
              {order.type === 'dine_in' && order.tableNumber
                ? `Mesa ${order.tableNumber}`
                : TYPE_LABEL[order.type]}
            </p>
          </div>
        </div>

        {/* Items list */}
        {shownItems.length > 0 && (
          <div className="space-y-1 border-t border-maison-border pt-3">
            {shownItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-2xs text-maison-cream-muted">
                  <span className="font-medium text-maison-cream">{item.quantity}×</span>{' '}
                  {item.name}
                </span>
                <span className="flex-shrink-0 font-mono text-2xs tabular-nums text-maison-cream-muted">
                  {formatCurrency(item.totalPrice)}
                </span>
              </div>
            ))}
            {remaining > 0 && (
              <p className="text-2xs text-maison-cream-dim">+{remaining} producto{remaining !== 1 ? 's' : ''} más</p>
            )}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between border-t border-maison-border px-4 py-3">
        <span className="font-mono text-sm font-semibold text-maison-cream">
          {formatCurrency(order.total)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'rounded px-1.5 py-0.5 text-2xs font-medium',
            order.paymentStatus === 'paid'
              ? 'bg-maison-sage-bg text-maison-sage'
              : 'bg-surface-3 text-maison-cream-dim',
          )}>
            {order.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
          </span>
        </div>
      </div>
    </article>
  );
}

function OrderCardSkeleton() {
  return (
    <div className="card flex flex-col gap-0 overflow-hidden" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-maison-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-2.5 w-12" />
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 flex-shrink-0 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
        <div className="space-y-1.5 border-t border-maison-border pt-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <Skeleton className="h-2.5 flex-1" />
              <Skeleton className="h-2.5 w-14 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-maison-border px-4 py-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-14 rounded" />
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function OrdersPage() {
  const { selectedBranch } = useBranch();
  const { stats, orders, isLoading, error, filters, setFilters, refresh } = useOrders(
    selectedBranch.id,
  );
  const [activeTab, setActiveTab] = useState<OrderStatus | 'active' | 'all'>('active');
  const hasError = !!error;

  function handleTabFilter(val: OrderStatus | 'active' | 'all') {
    setActiveTab(val);
    if (val === 'all') {
      setFilters({ status: undefined });
    } else if (val === 'active') {
      // Show pending + confirmed + preparing + ready — backend handles 'active' filter
      setFilters({ status: undefined });
    } else {
      setFilters({ status: val as OrderStatus });
    }
  }

  const liveOrders = (stats?.pendingOrders ?? 0) + (stats?.preparingOrders ?? 0) + (stats?.readyOrders ?? 0);

  return (
    <div className="flex flex-col gap-7 animate-fade-in">

      {/* ── Page Header ──────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-3xl font-medium leading-none text-maison-cream">
              Pedidos
            </h1>
            {/* Live indicator */}
            <span className="flex items-center gap-1.5 rounded-full border border-maison-sage/30 bg-maison-sage-bg px-2 py-0.5 text-2xs font-medium text-maison-sage">
              <span className="h-1.5 w-1.5 rounded-full bg-maison-sage animate-pulse-soft" aria-hidden="true" />
              En vivo
            </span>
          </div>
          <p className="mt-1.5 text-sm text-maison-cream-muted">
            {selectedBranch.isGlobal
              ? `Monitor de órdenes — Todas las sucursales · ${liveOrders} activos ahora`
              : `Monitor de ${selectedBranch.name} · ${liveOrders} activos ahora`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={refresh}
            className="btn-ghost"
            disabled={isLoading}
            aria-label="Actualizar pedidos"
          >
            <IconRefresh className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Actualizar
          </button>
        </div>
      </header>

      {/* ── Métricas ─────────────────────────────────────────── */}
      <section aria-labelledby="orders-kpis">
        <h2 id="orders-kpis" className="sr-only">Métricas de pedidos de hoy</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
          ) : (
            <>
              <StatCard
                label="Pedidos hoy"
                value={stats ? formatNumber(stats.totalToday) : '—'}
                delta={stats ? `${formatNumber(stats.cancelledToday)} cancelados` : undefined}
                deltaPositive={false}
                deltaLabel=""
                icon={<IconOrders className="h-3.5 w-3.5" />}
                colorVariant="cream"
              />
              <StatCard
                label="En preparación"
                value={stats ? formatNumber(stats.preparingOrders + stats.pendingOrders) : '—'}
                delta={stats ? `${formatNumber(stats.readyOrders)} listos` : undefined}
                deltaPositive
                deltaLabel=""
                icon={<IconClock className="h-3.5 w-3.5" />}
                colorVariant="gold"
              />
              <StatCard
                label="Completados hoy"
                value={stats ? formatNumber(stats.completedToday) : '—'}
                icon={<IconUsers className="h-3.5 w-3.5" />}
                colorVariant="sage"
              />
              <StatCard
                label="Ingresos hoy"
                value={stats ? formatCurrency(stats.revenueToday) : '—'}
                delta={stats ? `Ticket prom. ${formatCurrency(stats.avgOrderValue)}` : undefined}
                deltaPositive
                deltaLabel=""
                icon={<IconDollarSign className="h-3.5 w-3.5" />}
                colorVariant="amber"
              />
            </>
          )}
        </div>
      </section>

      {/* ── Status tabs + Search ──────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status tabs */}
        <div
          className="flex flex-wrap gap-0.5 rounded-lg border border-maison-border bg-surface-2 p-0.5"
          role="tablist"
          aria-label="Filtrar pedidos por estado"
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.value}
              onClick={() => handleTabFilter(tab.value)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                activeTab === tab.value
                  ? 'bg-surface-1 text-maison-cream shadow-card'
                  : 'text-maison-cream-dim hover:text-maison-cream',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs flex-1">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-maison-cream-dim" />
          <input
            type="search"
            placeholder="Buscar por # o cliente..."
            value={filters.search ?? ''}
            onChange={(e) => setFilters({ search: e.target.value || undefined })}
            className="input-base w-full pl-8"
            aria-label="Buscar pedidos"
          />
        </div>
      </div>

      {/* ── Orders grid ──────────────────────────────────────── */}
      <section aria-labelledby="orders-grid-title" aria-live="polite" aria-atomic="false">
        <h2 id="orders-grid-title" className="sr-only">Monitor de pedidos</h2>

        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <OrderCardSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && (hasError || !orders?.data?.length) && (
          <div className="card">
            <EmptyState
              icon={
                hasError
                  ? <IconAlertCircle className="h-6 w-6" />
                  : <IconOrders className="h-6 w-6" />
              }
              title={hasError ? 'No se pudieron cargar los pedidos' : 'Sin pedidos activos'}
              description={
                hasError
                  ? 'Verifica la conexión con el API del servidor.'
                  : activeTab === 'active'
                    ? 'No hay pedidos en curso en este momento. Los nuevos pedidos aparecerán aquí automáticamente.'
                    : 'No hay pedidos que coincidan con el filtro seleccionado.'
              }
              className="py-20"
            />
          </div>
        )}

        {!isLoading && !hasError && orders?.data && orders.data.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orders.data.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
