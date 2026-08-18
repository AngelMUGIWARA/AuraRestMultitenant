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
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
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
  PENDING: { label: 'Pendiente', color: 'bg-amber-500/15 text-amber-400' },
  CONFIRMED: { label: 'Confirmado', color: 'bg-blue-500/15 text-blue-400' },
  IN_PROGRESS: { label: 'En progreso', color: 'bg-blue-500/15 text-blue-400' },
  READY: { label: 'Listo', color: 'bg-emerald-500/15 text-emerald-400' },
  SERVED: { label: 'Servido', color: 'bg-emerald-500/15 text-emerald-400' },
  COMPLETED: { label: 'Completado', color: 'bg-emerald-500/15 text-emerald-400' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-500/15 text-red-400' },
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
        <div className="flex items-center justify-between border-b border-maison-border px-4 py-3">
          <h2 className="text-sm font-medium text-maison-cream">Pedidos recientes</h2>
          <Link href="/cashier/orders" className="text-2xs font-medium text-accent hover:underline">
            Ver todos
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-maison-cream-muted">No hay pedidos registrados hoy</p>
          </div>
        ) : (
          <div className="divide-y divide-maison-border">
            {recentOrders.slice(0, 10).map((order) => {
              const statusBadge = STATUS_BADGES[order.status] ?? STATUS_BADGES.PENDING;
              const paymentBadge = PAYMENT_BADGES[order.paymentStatus] ?? PAYMENT_BADGES.unpaid;
              return (
                <div key={order.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-maison-cream">
                        #{order.orderNumber}
                      </span>
                      {order.table && (
                        <span className="text-2xs text-maison-cream-dim">
                          Mesa {order.table.number}
                        </span>
                      )}
                    </div>
                    <p className="text-2xs text-maison-cream-dim">{formatTime(order.createdAt)}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium ${paymentBadge.color}`}>
                    {paymentBadge.label}
                  </span>
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
