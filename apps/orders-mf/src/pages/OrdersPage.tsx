import { useState } from 'react';
import { useBranch } from '@maison/ui';
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
  { label: string; badge: string; border: string; dot: string; accentBg: string; emoji: string }
> = {
  pending: {
    label: 'Pendiente',
    badge: 'badge bg-maison-gold-bg text-maison-gold',
    border: 'border-l-maison-gold',
    dot: 'bg-maison-gold animate-pulse-soft',
    accentBg: 'from-maison-gold/5',
    emoji: '⏳',
  },
  confirmed: {
    label: 'Confirmado',
    badge: 'badge badge-inactive',
    border: 'border-l-maison-cream-dim',
    dot: 'bg-maison-cream-dim',
    accentBg: 'from-maison-cream-dim/5',
    emoji: '✅',
  },
  preparing: {
    label: 'En preparación',
    badge: 'badge bg-maison-amber-glow text-maison-amber',
    border: 'border-l-maison-amber',
    dot: 'bg-maison-amber animate-pulse-soft',
    accentBg: 'from-maison-amber/5',
    emoji: '🍳',
  },
  ready: {
    label: 'Listo',
    badge: 'badge-active badge',
    border: 'border-l-maison-sage',
    dot: 'bg-maison-sage',
    accentBg: 'from-maison-sage/5',
    emoji: '🔔',
  },
  delivered: {
    label: 'Entregado',
    badge: 'badge badge-inactive',
    border: 'border-l-maison-cream-dim',
    dot: 'bg-maison-cream-dim',
    accentBg: 'from-maison-cream-dim/5',
    emoji: '📦',
  },
  paid: {
    label: 'Pagado',
    badge: 'badge-active badge',
    border: 'border-l-maison-sage',
    dot: 'bg-maison-sage',
    accentBg: 'from-maison-sage/5',
    emoji: '💳',
  },
  cancelled: {
    label: 'Cancelado',
    badge: 'badge-suspended badge',
    border: 'border-l-maison-ruby',
    dot: 'bg-maison-ruby',
    accentBg: 'from-maison-ruby/5',
    emoji: '✖',
  },
};

const TYPE_LABEL: Record<OrderType, string> = {
  dine_in: 'Mesa',
  takeaway: 'Para llevar',
  delivery: 'Domicilio',
};

const TYPE_ICON: Record<OrderType, string> = {
  dine_in: '🪑',
  takeaway: '🛍️',
  delivery: '🛵',
};

const STATUS_TABS: { value: OrderStatus | 'active' | 'all'; label: string; dot?: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos', dot: 'bg-maison-amber animate-pulse-soft' },
  { value: 'pending', label: 'Pendientes', dot: 'bg-maison-gold' },
  { value: 'preparing', label: 'En prep.', dot: 'bg-maison-amber' },
  { value: 'ready', label: 'Listos', dot: 'bg-maison-sage' },
  { value: 'delivered', label: 'Entregados', dot: 'bg-maison-cream-dim' },
];

/* ─── Status action config ──────────────────────────────────────── */

const NEXT_STATUS: Record<string, { label: string; nextStatus: string; icon: string } | null> = {
  pending: { label: 'Confirmar', nextStatus: 'CONFIRMED', icon: '✓' },
  confirmed: { label: 'Preparar', nextStatus: 'IN_PROGRESS', icon: '🍳' },
  preparing: { label: 'Listo', nextStatus: 'READY', icon: '🔔' },
  ready: { label: 'Entregar', nextStatus: 'DELIVERED', icon: '📦' },
  delivered: null,
  paid: null,
  cancelled: null,
};

const CANCELLABLE_STATUSES = new Set(['pending', 'confirmed', 'preparing', 'ready']);

/* ─── Order card ────────────────────────────────────────────────── */

function OrderCard({
  order,
  onUpdateStatus,
  onCancel,
  disabled,
}: {
  order: Order;
  onUpdateStatus: (orderId: string, status: string) => void;
  onCancel: (orderId: string) => void;
  disabled: boolean;
}) {
  const cfg = STATUS_CONFIG[order.status];
  const maxItems = 3;
  const shownItems = order.items?.slice(0, maxItems) ?? [];
  const remaining = (order.items?.length ?? order.itemCount ?? 0) - maxItems;
  const next = NEXT_STATUS[order.status];
  const canCancel = CANCELLABLE_STATUSES.has(order.status);

  return (
    <article
      className={cn(
        'relative flex flex-col gap-0 overflow-hidden rounded-xl border border-maison-border bg-surface-1 border-l-4 shadow-sm hover:shadow-md transition-shadow',
        cfg.border,
      )}
    >
      {/* Subtle gradient accent based on status */}
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-40 pointer-events-none', cfg.accentBg, 'to-transparent')} aria-hidden="true" />

      {/* Card header */}
      <div className="relative flex items-center justify-between border-b border-maison-border px-4 py-3 bg-surface-2/50">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-maison-cream">
            <IconHash className="h-3 w-3 text-maison-cream-dim" />
            {order.orderNumber}
          </span>
          <span className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold', cfg.badge)}>
            <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', cfg.dot)} aria-hidden="true" />
            {cfg.label}
          </span>
        </div>
        <time
          dateTime={order.createdAt}
          className="text-[10px] font-medium text-maison-cream-dim bg-surface-2 rounded-full px-2.5 py-1 border border-maison-border"
          title={new Date(order.createdAt).toLocaleString('es-MX')}
        >
          {formatRelativeTime(order.createdAt)}
        </time>
      </div>

      {/* Card body */}
      <div className="relative flex flex-1 flex-col gap-3 p-4">
        {/* Customer + type */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white shadow-sm"
            style={{ background: 'linear-gradient(140deg, rgb(var(--color-accent-dim)) 0%, rgb(var(--color-accent)) 100%)' }}
            aria-hidden="true"
          >
            {order.customerName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-maison-cream">{order.customerName}</p>
            <p className="text-[10px] text-maison-cream-dim flex items-center gap-1">
              <span>{TYPE_ICON[order.type]}</span>
              {order.type === 'dine_in' && order.tableNumber
                ? `Mesa ${order.tableNumber}`
                : TYPE_LABEL[order.type]}
            </p>
          </div>
          {/* Payment badge */}
          <span className={cn(
            'flex-shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold',
            order.paymentStatus === 'paid'
              ? 'bg-maison-sage/10 text-maison-sage border border-maison-sage/30'
              : 'bg-surface-3 text-maison-cream-dim border border-maison-border',
          )}>
            {order.paymentStatus === 'paid' ? '✓ Pagado' : 'Pendiente'}
          </span>
        </div>

        {/* Items list */}
        {shownItems.length > 0 && (
          <div className="space-y-1.5 rounded-lg bg-surface-2/70 border border-maison-border/50 px-3 py-2.5">
            {shownItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] text-maison-cream-muted">
                  <span className="font-bold text-maison-cream">{item.quantity}×</span>{' '}
                  {item.name}
                </span>
                <span className="flex-shrink-0 font-mono text-[11px] tabular-nums text-maison-cream-muted">
                  {formatCurrency(item.totalPrice)}
                </span>
              </div>
            ))}
            {remaining > 0 && (
              <p className="text-[10px] text-maison-amber font-medium">+{remaining} más</p>
            )}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="relative flex items-center justify-between border-t border-maison-border px-4 py-2.5 bg-surface-2/30">
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] text-maison-cream-dim font-medium">Total</span>
          <span className="font-mono text-base font-black text-maison-cream">
            {formatCurrency(order.total)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-maison-cream-dim">
          <span>{cfg.emoji}</span>
          <span className="font-medium">{cfg.label}</span>
        </div>
      </div>

      {/* Card actions */}
      {(next || canCancel) && (
        <div className="relative flex items-center gap-2 border-t border-maison-border px-4 py-3 bg-surface-2/50">
          {next && (
            <button
              type="button"
              onClick={() => onUpdateStatus(order.id, next.nextStatus)}
              disabled={disabled}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-maison-amber text-surface-0 py-2 text-xs font-bold hover:bg-maison-amber/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <span aria-hidden="true">{next.icon}</span>
              {next.label}
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => { if (window.confirm(`¿Cancelar orden #${order.orderNumber}?`)) onCancel(order.id); }}
              disabled={disabled}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-maison-ruby/40 text-maison-ruby bg-maison-ruby/5 py-2 px-3 text-xs font-bold hover:bg-maison-ruby/15 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Cancelar
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function OrderCardSkeleton() {
  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-xl border border-maison-border bg-surface-1 border-l-4 border-l-maison-border" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-maison-border px-4 py-3 bg-surface-2/50">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          <Skeleton className="h-6 w-16 rounded-lg" />
        </div>
        <div className="rounded-lg bg-surface-2 border border-maison-border/50 px-3 py-2.5 space-y-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <Skeleton className="h-2.5 flex-1" />
              <Skeleton className="h-2.5 w-14 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-maison-border px-4 py-2.5 bg-surface-2/30">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function OrdersPage() {
  const { selectedBranch } = useBranch();
  const { stats, orders, isLoading, error, filters, setFilters, refresh, updateOrderStatus, cancelOrder, isActing } = useOrders(
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
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* ── Page Header ──────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold leading-none text-maison-cream">
              Pedidos
            </h1>
            {/* Live indicator */}
            <span className="flex items-center gap-1.5 rounded-full border border-maison-sage/30 bg-maison-sage/10 px-2.5 py-1 text-[10px] font-bold text-maison-sage tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-maison-sage animate-pulse-soft" aria-hidden="true" />
              EN VIVO
            </span>
            {liveOrders > 0 && (
              <span className="flex items-center justify-center h-5 min-w-[20px] rounded-full bg-maison-amber text-surface-0 text-[10px] font-black px-1.5">
                {liveOrders}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-maison-cream-muted">
            {selectedBranch.isGlobal
              ? `Todas las sucursales · ${liveOrders} activos ahora`
              : `${selectedBranch.name} · ${liveOrders} activos ahora`}
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-2 self-start sm:self-auto rounded-xl border border-maison-border bg-surface-1 px-4 py-2.5 text-sm font-semibold text-maison-cream-muted hover:text-maison-cream hover:bg-surface-2 transition-all disabled:opacity-50"
          disabled={isLoading}
          aria-label="Actualizar pedidos"
        >
          <IconRefresh className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          Actualizar
        </button>
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
          className="flex flex-wrap gap-1 rounded-xl border border-maison-border bg-surface-2 p-1"
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
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                activeTab === tab.value
                  ? 'bg-surface-1 text-maison-cream shadow-sm border border-maison-border'
                  : 'text-maison-cream-dim hover:text-maison-cream hover:bg-surface-3',
              )}
            >
              {tab.dot && activeTab === tab.value && (
                <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', tab.dot)} aria-hidden="true" />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-maison-cream-dim" />
          <input
            type="search"
            placeholder="Buscar por # o cliente..."
            value={filters.search ?? ''}
            onChange={(e) => setFilters({ search: e.target.value || undefined })}
            className="input-base w-full pl-9 rounded-xl"
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
          <div className="rounded-2xl border-2 border-dashed border-maison-border bg-surface-1/50">
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
              <OrderCard
                key={order.id}
                order={order}
                onUpdateStatus={updateOrderStatus}
                onCancel={cancelOrder}
                disabled={isActing}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
