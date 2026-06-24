import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { StatCard, StatCardSkeleton, EmptyState, IconAnalytics } from '@maison/ui';
import { useReportsData } from '../hooks/useReportsData';

const PAYMENT_COLORS: Record<string, string> = {
  CASH:     '#c9a84c',
  CARD:     '#7a9e7e',
  TRANSFER: '#8b7355',
  OTHER:    '#6b7280',
};

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

export default function ReportesPage() {
  const { data, isLoading, error } = useReportsData();

  if (error) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <header>
          <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">Reportes</h1>
        </header>
        <div className="card">
          <EmptyState
            icon={<IconAnalytics className="h-6 w-6" />}
            title="Error al cargar reportes"
            description={error}
            className="py-20"
          />
        </div>
      </div>
    );
  }

   return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <header>
        <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">Reportes</h1>
        <p className="mt-1.5 text-sm text-maison-cream-muted">
          {data.sales
            ? `${data.sales.startDate} — ${data.sales.endDate}`
            : 'Cargando período...'}
        </p>
      </header>

      {/* ── KPI Cards ── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Ingresos totales"
              value={formatCurrency(data.sales?.summary.totalRevenue ?? 0)}
              icon={<IconAnalytics className="h-4 w-4" />}
              colorVariant="gold"
            />
            <StatCard
              label="Total de órdenes"
              value={String(data.sales?.summary.totalOrders ?? 0)}
              icon={<IconAnalytics className="h-4 w-4" />}
              colorVariant="sage"
            />
            <StatCard
              label="Promedio por orden"
              value={formatCurrency(data.sales?.summary.averageOrderValue ?? 0)}
              icon={<IconAnalytics className="h-4 w-4" />}
              colorVariant="amber"
            />
            <StatCard
              label="Productos vendidos"
              value={String(
                data.products?.topProducts.reduce((sum, p) => sum + p.totalQuantity, 0) ?? 0
              )}
              icon={<IconAnalytics className="h-4 w-4" />}
              colorVariant="cream"
            />
          </>
        )}
      </section>

      {/* ── Ventas diarias ── */}
      <section className="card p-5">
        <h2 className="text-sm font-medium text-maison-cream-muted uppercase tracking-wider mb-4">
          Ventas por día
        </h2>
        {isLoading ? (
          <div className="h-64 bg-surface-2 rounded animate-pulse" />
        ) : (data.sales?.dailySales.length ?? 0) === 0 ? (
          <p className="text-sm text-maison-cream-dim text-center py-16">Sin datos en el período</p>
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={data.sales?.dailySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6 }}
                // Ventas diarias
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [formatCurrency(Number(value)), 'Ingresos']}
              />
              <Bar dataKey="revenue" fill="#c9a84c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── Métodos de pago + Productos top ── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

        {/* Dona de métodos de pago */}
        <section className="card p-5">
          <h2 className="text-sm font-medium text-maison-cream-muted uppercase tracking-wider mb-4">
            Métodos de pago
          </h2>
          {isLoading ? (
            <div className="h-56 bg-surface-2 rounded animate-pulse" />
          ) : (data.payments?.byMethod.length ?? 0) === 0 ? (
            <p className="text-sm text-maison-cream-dim text-center py-16">Sin datos en el período</p>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <PieChart>
                <Pie
                  data={data.payments?.byMethod}
                  dataKey="amount"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {data.payments?.byMethod.map((entry) => (
                    <Cell
                      key={entry.method}
                      fill={PAYMENT_COLORS[entry.method] ?? '#6b7280'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6 }}
                  // Métodos de pago
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                />
                <Legend
                  formatter={(value: string) => (
                    `${value} (${data.payments?.byMethod.find(m => m.method === value)?.percentage ?? 0}%)`
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* Top productos */}
        <section className="card p-5">
          <h2 className="text-sm font-medium text-maison-cream-muted uppercase tracking-wider mb-4">
            Productos más vendidos
          </h2>
          {isLoading ? (
            <div className="h-56 bg-surface-2 rounded animate-pulse" />
          ) : (data.products?.topProducts.length ?? 0) === 0 ? (
            <p className="text-sm text-maison-cream-dim text-center py-16">Sin datos en el período</p>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart
                data={data.products?.topProducts.slice(0, 5)}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#888', fontSize: 11 }}
                  width={120}
                />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6 }}
                  // Productos
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [Number(value), 'Unidades']}
                />
                <Bar dataKey="totalQuantity" fill="#7a9e7e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      {/* ── Horarios pico ── */}
      <section className="card p-5">
        <h2 className="text-sm font-medium text-maison-cream-muted uppercase tracking-wider mb-4">
          Horarios de mayor actividad
        </h2>
        {isLoading ? (
          <div className="h-56 bg-surface-2 rounded animate-pulse" />
        ) : (data.peakHours?.byHour.length ?? 0) === 0 ? (
          <p className="text-sm text-maison-cream-dim text-center py-16">Sin datos en el período</p>
        ) : (
          <ResponsiveContainer width="100%" height={224}>
            <BarChart data={data.peakHours?.byHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="label" tick={{ fill: '#888', fontSize: 11 }} />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6 }}
                // Horarios pico
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [Number(value), 'Órdenes']}
              />
              <Bar dataKey="orders" fill="#8b7355" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  );
}
