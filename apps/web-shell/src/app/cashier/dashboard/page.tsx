'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@maison/api-client';
import { Skeleton } from '@maison/ui';

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  paidOrders: number;
  pendingOrders: number;
  averageTicket: number;
}

interface OrderSummary {
  id: string;
  orderNumber: number;
  folio?: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  customerName?: string;
  waiterName?: string;
  table?: { number: number } | null;
}

interface TableInfo {
  id: string;
  number: number;
  status: string;
  capacity: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 transition-colors ${accent ? 'border-accent/30 bg-accent/5' : 'border-maison-border bg-surface-1'}`}>
      <p className="text-2xs font-medium uppercase tracking-wider text-maison-cream-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ? 'text-accent' : 'text-maison-cream'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-2xs text-maison-cream-dim">{sub}</p>}
    </div>
  );
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-500/15 text-amber-400' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500/15 text-blue-400' },
  preparing: { label: 'En preparación', color: 'bg-blue-500/15 text-blue-400' },
  ready: { label: 'Listo', color: 'bg-emerald-500/15 text-emerald-400' },
  delivered: { label: 'Entregado', color: 'bg-emerald-500/15 text-emerald-400' },
  paid: { label: 'Entregado', color: 'bg-emerald-500/15 text-emerald-400' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/15 text-red-400' },
};

const PAYMENT_BADGES: Record<string, { label: string; color: string }> = {
  unpaid: { label: 'Sin pagar', color: 'bg-amber-500/15 text-amber-400' },
  partial: { label: 'Parcial', color: 'bg-blue-500/15 text-blue-400' },
  paid: { label: 'Pagado', color: 'bg-emerald-500/15 text-emerald-400' },
};

export default function CashierDashboardPage() {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, ordersRes, tablesRes] = await Promise.allSettled([
        apiClient.get<OrderStats>('/orders/stats'),
        apiClient.get<{ data: OrderSummary[] }>('/orders?limit=20'),
        apiClient.get<TableInfo[]>('/tables'),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }

      if (ordersRes.status === 'fulfilled') {
        const raw = ordersRes.value;
        setRecentOrders(Array.isArray(raw) ? raw : (raw as any).data ?? []);
      }

      if (tablesRes.status === 'fulfilled') {
        const raw = tablesRes.value;
        setTables(Array.isArray(raw) ? raw : (raw as any).data ?? []);
      }
    } catch (err) {
      setError('Error al cargar datos del dashboard');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm font-medium text-maison-ruby">{error}</p>
          <button
            onClick={fetchData}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent/90"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const activeTables = tables.filter((t) => t.status === 'OCCUPIED' || t.status === 'RESERVED').length;
  const availableTables = tables.filter((t) => t.status === 'AVAILABLE').length;

  const filteredOrders = recentOrders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (paymentFilter !== 'all' && order.paymentStatus !== paymentFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const folio = (order.folio || `#${order.orderNumber}`).toLowerCase();
      const table = order.table ? `mesa ${order.table.number}` : '';
      const customer = (order.customerName || '').toLowerCase();
      const waiter = (order.waiterName || '').toLowerCase();
      if (
        !folio.includes(q) &&
        !table.includes(q) &&
        !customer.includes(q) &&
        !waiter.includes(q)
      ) return false;
    }
    return true;
  });

  const hasActiveFilters = statusFilter !== 'all' || paymentFilter !== 'all' || searchQuery.trim() !== '';

  function clearFilters() {
    setStatusFilter('all');
    setPaymentFilter('all');
    setSearchQuery('');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-maison-cream">Dashboard</h1>
          <p className="text-xs text-maison-cream-dim">Resumen de actividad de hoy</p>
        </div>
        <Link
          href="/cashier/pos"
          className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent/90"
        >
          Abrir Caja
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Cobros hoy"
          value={stats?.paidOrders ?? 0}
          accent
        />
        <StatCard
          label="Total cobrado"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
        />
        <StatCard
          label="Pedidos pendientes"
          value={stats?.pendingOrders ?? 0}
          sub={`${stats?.totalOrders ?? 0} pedidos totales`}
        />
        <StatCard
          label="Mesas disponibles"
          value={availableTables}
          sub={`${activeTables} ocupadas / ${tables.length} total`}
        />
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border border-maison-border bg-surface-1">
        <div className="border-b border-maison-border px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-maison-cream">Pedidos recientes</h2>
            <Link href="/cashier/orders" className="text-2xs font-medium text-accent hover:underline">
              Ver todos
            </Link>
          </div>

          {/* Filters */}
          <div className="mt-3 flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-maison-cream-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                placeholder="Buscar pedido..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-maison-border bg-surface-2 px-9 py-1.5 text-xs text-maison-cream placeholder-maison-cream-dim focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
                aria-label="Buscar pedidos"
              />
            </div>

            {/* Status filters */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex flex-col gap-1">
                <span className="text-2xs font-medium text-maison-cream-dim uppercase tracking-wider">Estado pedido</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { value: 'all', label: 'Todos' },
                    { value: 'pending', label: 'Pendientes' },
                    { value: 'preparing', label: 'En preparación' },
                    { value: 'ready', label: 'Listos' },
                    { value: 'delivered', label: 'Entregados' },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setStatusFilter(tab.value)}
                      className={`rounded-md px-2.5 py-1 text-2xs font-medium transition-all ${
                        statusFilter === tab.value
                          ? 'bg-accent/15 text-accent border border-accent/30'
                          : 'text-maison-cream-dim hover:text-maison-cream hover:bg-surface-3 border border-transparent'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hidden sm:block w-px h-6 bg-maison-border" aria-hidden="true" />

              <div className="flex flex-col gap-1">
                <span className="text-2xs font-medium text-maison-cream-dim uppercase tracking-wider">Estado pago</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { value: 'all', label: 'Todos' },
                    { value: 'paid', label: 'Pagados' },
                    { value: 'unpaid', label: 'Sin pagar' },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setPaymentFilter(tab.value)}
                      className={`rounded-md px-2.5 py-1 text-2xs font-medium transition-all ${
                        paymentFilter === tab.value
                          ? 'bg-accent/15 text-accent border border-accent/30'
                          : 'text-maison-cream-dim hover:text-maison-cream hover:bg-surface-3 border border-transparent'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-auto text-2xs font-medium text-maison-cream-dim hover:text-maison-cream underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </div>

        {recentOrders.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-maison-cream-muted">No hay pedidos registrados hoy</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-maison-cream-muted">No hay pedidos que coincidan con los filtros.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 text-2xs font-medium text-accent hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="divide-y divide-maison-border">
            {filteredOrders.slice(0, 10).map((order) => {
              const statusBadge = STATUS_BADGES[order.status] ?? STATUS_BADGES.pending;
              const paymentBadge = PAYMENT_BADGES[order.paymentStatus] ?? PAYMENT_BADGES.unpaid;
              return (
                <div key={order.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-maison-cream">
                        {order.folio || `#${order.orderNumber}`}
                      </span>
                      {order.table && (
                        <span className="text-2xs text-maison-cream-dim">
                          Mesa {order.table.number}
                        </span>
                      )}
                    </div>
                    {order.customerName && (
                      <p className="text-2xs text-maison-cream-dim truncate">{order.customerName}</p>
                    )}
                    <p className="text-2xs text-maison-cream-dim">{formatTime(order.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium ${paymentBadge.color}`}>
                      {paymentBadge.label}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-maison-cream tabular-nums">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Table status */}
      {tables.length > 0 && (
        <div className="rounded-xl border border-maison-border bg-surface-1">
          <div className="border-b border-maison-border px-4 py-3">
            <h2 className="text-sm font-medium text-maison-cream">Estado de mesas</h2>
          </div>
          <div className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {tables.map((table) => {
              const isOccupied = table.status === 'OCCUPIED' || table.status === 'RESERVED';
              return (
                <div
                  key={table.id}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors ${
                    isOccupied
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-emerald-500/30 bg-emerald-500/5'
                  }`}
                >
                  <span className="text-sm font-medium text-maison-cream">{table.number}</span>
                  <span className={`text-2xs font-medium ${isOccupied ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {isOccupied ? 'Ocupada' : 'Libre'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
