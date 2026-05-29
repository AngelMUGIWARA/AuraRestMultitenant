'use client';

import { useState } from 'react';
import { useBranch } from '@/context/BranchContext';
import { useReservations } from '@/hooks/useReservations';
import { formatNumber, cn } from '@/lib/utils';
import { RESERVATION_STATUS_LABELS } from '@/lib/constants';
import { StatCard, StatCardSkeleton } from '@/components/admin/dashboard/StatCard';
import { Skeleton, SkeletonAvatar, SkeletonRow } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  IconCalendar, IconUsers, IconClock, IconPlus, IconRefresh, IconAlertCircle,
} from '@/components/ui/Icons';
import type { ReservationStatus } from '@/types/reservation.types';

const STATUS_BADGE: Record<ReservationStatus, string> = {
  pending: 'badge bg-maison-gold-bg text-maison-gold',
  confirmed: 'badge-active',
  arrived: 'badge bg-maison-amber-glow text-maison-amber',
  completed: 'badge badge-inactive',
  cancelled: 'badge-suspended',
  no_show: 'badge-suspended',
};

const STATUS_FILTERS: { value: ReservationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'arrived', label: 'En mesa' },
  { value: 'completed', label: 'Completadas' },
  { value: 'cancelled', label: 'Canceladas' },
];

export default function ReservacionesPage() {
  const { selectedBranch } = useBranch();
  const { stats, reservations, isLoading, error, filters, setFilters, refresh } =
    useReservations(selectedBranch.id);
  const [activeStatus, setActiveStatus] = useState<ReservationStatus | 'all'>('all');
  const hasError = !!error;
  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  function handleStatusFilter(val: ReservationStatus | 'all') {
    setActiveStatus(val);
    setFilters({ status: val === 'all' ? undefined : val });
  }

  return (
    <div className="flex flex-col gap-7 animate-fade-in">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">
            Reservaciones
          </h1>
          <p className="mt-1.5 text-sm text-maison-cream-muted capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button type="button" onClick={refresh} className="btn-ghost" disabled={isLoading}>
            <IconRefresh className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
          <button type="button" className="btn-primary">
            <IconPlus className="h-4 w-4" />
            Nueva reservación
          </button>
        </div>
      </header>

      {/* ── Métricas Primero ──────────────────────────────────── */}
      <section aria-labelledby="reservations-kpis">
        <h2 id="reservations-kpis" className="sr-only">Métricas de hoy</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
          ) : (
            <>
              <StatCard
                label="Reservas hoy"
                value={stats ? formatNumber(stats.totalToday) : '—'}
                delta={stats ? `${formatNumber(stats.confirmedToday)} confirmadas` : undefined}
                deltaPositive
                deltaLabel=""
                icon={<IconCalendar className="h-3.5 w-3.5" />}
                colorVariant="cream"
              />
              <StatCard
                label="Pendientes"
                value={stats ? formatNumber(stats.pendingConfirmation) : '—'}
                icon={<IconClock className="h-3.5 w-3.5" />}
                colorVariant="gold"
              />
              <StatCard
                label="Completadas"
                value={stats ? formatNumber(stats.completedToday) : '—'}
                icon={<IconCalendar className="h-3.5 w-3.5" />}
                colorVariant="sage"
              />
              <StatCard
                label="Ocupación"
                value={stats ? `${stats.occupancyRate.toFixed(0)}%` : '—'}
                delta={stats ? `${stats.averagePartySize.toFixed(1)} personas/mesa` : undefined}
                deltaPositive
                deltaLabel=""
                icon={<IconUsers className="h-3.5 w-3.5" />}
                colorVariant="amber"
              />
            </>
          )}
        </div>
      </section>

      {/* Status filter pills */}
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

      {/* Reservations list */}
      <section className="card overflow-hidden" aria-labelledby="reservations-table-title">
        <div className="border-b border-maison-border px-5 py-3.5">
          <h2 id="reservations-table-title" className="text-sm font-medium text-maison-cream">
            Lista de Reservaciones
          </h2>
        </div>

        {isLoading && (
          <div aria-hidden="true">
            <div className="border-b border-maison-border bg-surface-2 px-4 py-2.5">
              <div className="flex gap-3">
                {[0.3, 1, 0.4, 0.3, 0.4, 0.4].map((f, i) => (
                  <Skeleton key={i} className="h-2.5" style={{ flex: f }} />
                ))}
              </div>
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-maison-border px-5 py-3.5 last:border-b-0">
                <SkeletonAvatar size="sm" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && (hasError || !reservations?.data?.length) && (
          <EmptyState
            icon={hasError ? <IconAlertCircle className="h-6 w-6" /> : <IconCalendar className="h-6 w-6" />}
            title={hasError ? 'Error al cargar reservaciones' : 'Sin reservaciones'}
            description={
              hasError
                ? 'No se pudo conectar al API. Verifica la conexión.'
                : 'No hay reservaciones para hoy con los filtros seleccionados.'
            }
            className="py-16"
          />
        )}

        {!isLoading && !hasError && reservations?.data?.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" aria-labelledby="reservations-table-title">
              <thead>
                <tr className="border-b border-maison-border bg-surface-2">
                  {['Código', 'Huésped', 'Hora', 'Personas', 'Mesa', 'Estado'].map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className={cn(
                        'px-4 py-2.5 text-left text-2xs font-medium uppercase tracking-widest text-maison-cream-dim',
                        col === 'Personas' && 'text-right',
                      )}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservations.data.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-maison-border last:border-b-0 hover:bg-surface-2 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-2xs text-maison-cream-muted">{r.confirmationCode}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-maison-cream">{r.guestName}</p>
                      <p className="text-2xs text-maison-cream-dim">{r.guestPhone}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-maison-cream tabular-nums">{r.time}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-maison-cream">{r.partySize}</td>
                    <td className="px-4 py-3 text-maison-cream-muted">{r.tableName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('badge', STATUS_BADGE[r.status])}>
                        <span className="h-1 w-1 rounded-full bg-current" />
                        {RESERVATION_STATUS_LABELS[r.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
