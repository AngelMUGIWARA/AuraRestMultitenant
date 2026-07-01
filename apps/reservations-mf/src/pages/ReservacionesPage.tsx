import { useState } from 'react';
import { emit } from '@maison/event-bus';
import { useBranch } from '../context/BranchContext'; // <-- Importado para solucionar el Error 400
import { useReservations } from '../hooks/useReservations';
import { formatNumber, cn } from '../utils';
import { StatCard, StatCardSkeleton } from '@maison/ui';
import { Skeleton, SkeletonAvatar } from '@maison/ui';
import { EmptyState } from '@maison/ui';
import {
  IconCalendar,
  IconUsers,
  IconClock,
  IconPlus,
  IconRefresh,
  IconAlertCircle,
  IconSearch,
} from '@maison/ui';
import type { ReservationStatus } from '@maison/types';
import { ReservationModal } from '../components/ReservationModal';
import { reservationsService } from '../services/reservations.service';

/* ─── Constants ─────────────────────────────────────────────────── */

const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  ARRIVED: 'En mesa',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No se presentó',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge bg-maison-gold-bg text-maison-gold',
  CONFIRMED: 'badge-active',
  ARRIVED: 'badge bg-maison-amber-glow text-maison-amber',
  COMPLETED: 'badge badge-inactive',
  CANCELLED: 'badge-suspended',
  NO_SHOW: 'badge-suspended',
};

const STATUS_DOT: Record<string, string> = {
  PENDING: 'bg-maison-gold',
  CONFIRMED: 'bg-maison-sage',
  ARRIVED: 'bg-maison-amber',
  COMPLETED: 'bg-maison-cream-dim',
  CANCELLED: 'bg-maison-ruby',
  NO_SHOW: 'bg-maison-ruby',
};

const STATUS_TABS: { value: ReservationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'arrived', label: 'En mesa' },
  { value: 'completed', label: 'Completadas' },
  { value: 'cancelled', label: 'Canceladas' },
];

/* ─── Skeletons ─────────────────────────────────────────────────── */

function ReservationRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-maison-border px-5 py-4 last:border-b-0">
      <Skeleton className="h-7 w-14 rounded flex-shrink-0" />
      <SkeletonAvatar size="sm" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <Skeleton className="h-3 w-10 flex-shrink-0" />
      <Skeleton className="h-3 w-14 flex-shrink-0" />
      <Skeleton className="h-5 w-20 flex-shrink-0 rounded-full" />
    </div>
  );
}

function MiniCalendarSkeleton() {
  return (
    <div className="card p-4" aria-hidden="true">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-28" />
        <div className="flex gap-1">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded" />
        ))}
      </div>
    </div>
  );
}

/* ─── Reservation row ───────────────────────────────────────────── */

interface ReservationRowProps {
  id: string; // <-- Necesitamos el ID para saber cuál actualizar
  confirmationCode: string;
  guestName: string;
  guestPhone: string;
  time: string;
  partySize: number;
  tableName: string | undefined;
  status: ReservationStatus;
  notes: string | undefined;
  onCancel: (confirmationCode: string) => void;
  onStatusChange: (id: string, newStatus: ReservationStatus) => void; // <-- Nueva prop
}

function ReservationRow({
  id,
  confirmationCode,
  guestName,
  guestPhone,
  time,
  partySize,
  tableName,
  status,
  notes,
  onCancel,
  onStatusChange,
}: ReservationRowProps) {
  return (
    <div className="flex items-center gap-3 border-b border-maison-border px-5 py-3.5 last:border-b-0 hover:bg-surface-2 transition-colors">
      {/* Time */}
      <div className="flex w-14 flex-shrink-0 flex-col items-center justify-center rounded border border-maison-border bg-surface-2 py-1.5 text-center">
        <span className="font-mono text-xs font-semibold text-maison-cream">{time}</span>
      </div>

      {/* Guest avatar */}
      <div
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ background: 'linear-gradient(140deg, rgb(var(--color-accent-dim)) 0%, rgb(var(--color-accent)) 100%)' }}
        aria-hidden="true"
      >
        {guestName.charAt(0).toUpperCase()}
      </div>

      {/* Guest info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-maison-cream">{guestName}</p>
        <p className="text-2xs text-maison-cream-dim">{guestPhone}</p>
      </div>

      {/* Meta */}
      <div className="flex flex-shrink-0 items-center gap-1 text-2xs text-maison-cream-muted">
        <IconUsers className="h-3 w-3" />
        {partySize}
      </div>
      <span className="hidden w-16 truncate text-right text-2xs text-maison-cream-muted sm:block">
        {tableName ?? '—'}
      </span>

      {/* Status Interactivo (Select en lugar de Span) */}
      <div className="relative flex items-center">
        <span className={cn('absolute left-3 h-1.5 w-1.5 rounded-full pointer-events-none', STATUS_DOT[status.toLowerCase() as ReservationStatus])} />

        <select
          value={status.toUpperCase()} // <-- Forzamos minúsculas para el valor seleccionado
          onChange={(e) => onStatusChange(id, e.target.value as ReservationStatus)}
          className={cn(
            'badge pl-6 pr-2 py-1 appearance-none cursor-pointer border border-transparent hover:border-maison-cream-muted/30 focus:outline-none transition-all',
            STATUS_BADGE[status.toUpperCase() as ReservationStatus]
          )}
        >
          {Object.entries(RESERVATION_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key} className="bg-surface-1 text-maison-cream text-xs">
              {label} {/* Al usar Object.entries mapeamos exactamente las 6 opciones únicas */}
            </option>
          ))}
        </select>
      </div>

      {notes && (
        <div title={notes} className="hidden lg:block">
          <span className="text-maison-cream-dim">💬</span>
        </div>
      )}

      {/* Cancel action (only for pending/confirmed) */}
      {(status === 'pending' || status === 'confirmed') && (
        <button
          type="button"
          onClick={() => onCancel(confirmationCode)}
          className="btn-ghost hidden text-2xs text-maison-ruby hover:text-maison-ruby sm:block"
          aria-label={`Cancelar reservación ${confirmationCode}`}
        >
          Cancelar
        </button>
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function ReservacionesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { selectedBranch } = useBranch(); // <-- Extraemos la sucursal seleccionada del contexto global

  // Enviamos el id de la sucursal activa al hook para que no devuelva un Bad Request (400)
  const { stats, reservations, isLoading, error, filters, setFilters, refresh } =
    useReservations(selectedBranch.id);

  const [activeStatus, setActiveStatus] = useState<ReservationStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const hasError = !!error;

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Estructura blindada para extraer el listado sin importar inconsistencias de la API
  const listaReservas = Array.isArray(reservations)
    ? reservations
    : (reservations?.data || []);

  const tieneReservas = listaReservas.length > 0;

  function handleStatusFilter(val: ReservationStatus | 'all') {
    setActiveStatus(val);
    setFilters({ status: val === 'all' ? undefined : val });
  }

  function handleSearch(value: string) {
    setSearch(value);
    setFilters({ search: value || undefined });
  }

  function handleCancelReservation(reservationId: string, confirmationCode: string) {
    if (window.confirm(`¿Seguro que deseas cancelar la reservación ${confirmationCode}?`)) {
      emit('reservation:cancelled', { reservationId, confirmationCode });
      refresh();
    }
  }

  async function handleStatusChange(reservationId: string, newStatus: ReservationStatus) {
    try {
      // 1. LLAMADA REAL AL BACKEND: Cambia el estado en la base de datos
      // Mandamos el ID de la reservación y el nuevo estado (ej: 'arrived')
      await reservationsService.updateStatus(reservationId, newStatus);

      // 2. COMUNICACIÓN FRONTEND: Notifica en tiempo real a los microfrontends remotos (KDS, Recepción, etc.)
      emit('reservation:status-changed', { reservationId, status: newStatus });

      // 3. ACTUALIZACIÓN LOCAL: Refresca el hook para traer la información limpia y recalcular las StatCards
      refresh();

    } catch (error) {
      console.error('Error al actualizar el estado en la base de datos:', error);
      // Aquí puedes agregar un toast o notificación de alerta para el usuario si falla la red
    }
  }

  return (
    <div className="flex flex-col gap-7 animate-fade-in">

      {/* ── Page Header ──────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium leading-none text-maison-cream">
            Reservaciones
          </h1>
          <p className="mt-1.5 text-sm text-maison-cream-muted">
            <span className="capitalize">{today}</span>
            {" · "}
            {selectedBranch.isGlobal
              ? `Todas las sucursales`
              : `${selectedBranch.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button type="button" onClick={refresh} className="btn-ghost" disabled={isLoading}>
            <IconRefresh className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <IconPlus className="h-4 w-4" />
            Nueva reservación
          </button>
        </div>
      </header>

      {/* ── Métricas ──────────────────────────────────────────── */}
      <section aria-labelledby="res-kpis">
        <h2 id="res-kpis" className="sr-only">Métricas de hoy</h2>
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
                value={stats ? `${stats.occupancyRate?.toFixed(0) || 0}%` : '—'}
                delta={stats ? `${stats.averagePartySize?.toFixed(1) || '0.0'} pers/mesa` : undefined}
                deltaPositive
                deltaLabel=""
                icon={<IconUsers className="h-3.5 w-3.5" />}
                colorVariant="amber"
              />
            </>
          )}
        </div>
      </section>

      {/* ── Main layout: List + Mini Calendar ────────────────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_280px]">

        {/* Left: Filter + List */}
        <div className="flex flex-col gap-4">
          {/* Filter controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-xs flex-1">
              <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-maison-cream-dim" />
              <input
                type="search"
                placeholder="Buscar huésped o código..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="input-base w-full pl-8"
                aria-label="Buscar reservaciones"
              />
            </div>
            {/* Status pills */}
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Filtrar por estado"
            >
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleStatusFilter(tab.value)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    activeStatus === tab.value
                      ? 'border-maison-amber bg-maison-amber-glow text-maison-amber'
                      : 'border-maison-border bg-surface-1 text-maison-cream-muted hover:bg-surface-2',
                  )}
                  aria-pressed={activeStatus === tab.value}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reservations list */}
          <section className="card overflow-hidden" aria-labelledby="res-list-title">
            <div className="border-b border-maison-border px-5 py-3.5">
              <h2 id="res-list-title" className="text-sm font-medium text-maison-cream">
                Lista de Reservaciones
              </h2>
              {!isLoading && reservations && (
                <p className="mt-0.5 text-2xs text-maison-cream-dim">
                  {formatNumber(reservations.total || listaReservas.length)} reservaciones
                </p>
              )}
            </div>

            {isLoading && (
              <div aria-hidden="true">
                {Array.from({ length: 7 }).map((_, i) => (
                  <ReservationRowSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Renderizado condicional seguro y unificado para errores o listas vacías */}
            {!isLoading && (hasError || !tieneReservas) && (
              <EmptyState
                icon={
                  hasError
                    ? <IconAlertCircle className="h-6 w-6" />
                    : <IconCalendar className="h-6 w-6" />
                }
                title={
                  hasError
                    ? 'No se pudieron cargar las reservaciones'
                    : 'Sin reservaciones'
                }
                description={
                  hasError
                    ? 'Verifica la conexión con el API del servidor.'
                    : activeStatus !== 'all'
                      ? `No hay reservaciones con el estado "${RESERVATION_STATUS_LABELS[activeStatus as ReservationStatus]}".`
                      : 'No hay reservaciones para hoy en esta sucursal.'
                }
                className="py-16"
              />
            )}

            {/* Mapeo seguro utilizando la lista previamente procesada */}
            {!isLoading && !hasError && tieneReservas && (
              <div>
                {listaReservas.map((r: any) => (
                  <ReservationRow
                    key={r.id}
                    id={r.id}
                    confirmationCode={r.confirmationCode}
                    guestName={r.guestName}
                    guestPhone={r.guestPhone}
                    time={r.time}
                    partySize={r.partySize}
                    tableName={r.tableName || r.table?.number}
                    status={r.status}
                    notes={r.notes}
                    onCancel={(confirmationCode) =>
                      handleCancelReservation(r.id, confirmationCode)
                    }
                    onStatusChange={handleStatusChange} // <-- Pasamos la nueva función
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: Mini calendar + Quick stats */}
        <div className="flex flex-col gap-4">
          {isLoading ? (
            <MiniCalendarSkeleton />
          ) : (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-maison-cream">Calendario</h3>
                <span className="text-2xs text-maison-cream-dim capitalize">
                  {new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <EmptyState
                icon={<IconCalendar className="h-5 w-5" />}
                title="Vista de calendario"
                description="Disponible cuando el API esté conectado."
                className="py-10"
              />
            </div>
          )}

          {/* Today's summary */}
          <section className="card p-5" aria-labelledby="today-summary-title">
            <h3 id="today-summary-title" className="mb-4 text-sm font-medium text-maison-cream">
              Resumen del Día
            </h3>
            {isLoading ? (
              <div className="space-y-3" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-2 w-2 rounded-full flex-shrink-0" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
            ) : stats ? (
              <ul className="space-y-2.5">
                {[
                  { label: 'Confirmadas', value: stats.confirmedToday, dot: 'bg-maison-sage' },
                  { label: 'Pendientes', value: stats.pendingConfirmation, dot: 'bg-maison-gold' },
                  { label: 'En mesa', value: stats.arrivedToday, dot: 'bg-maison-amber' },
                  { label: 'Completadas', value: stats.completedToday, dot: 'bg-maison-cream-dim' },
                  { label: 'Canceladas', value: stats.cancelledToday, dot: 'bg-maison-ruby' },
                ].map((item) => (
                  <li key={item.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs text-maison-cream-muted">
                      <span className={cn('h-2 w-2 rounded-full', item.dot)} aria-hidden="true" />
                      {item.label}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-maison-cream">
                      {formatNumber(item.value)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<IconCalendar className="h-5 w-5" />}
                title="Sin datos"
                description="El resumen estará disponible con el API."
                className="py-6"
              />
            )}
          </section>
        </div>
      </div>

      <ReservationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          refresh();
          setIsModalOpen(false);
        }}
        branchId={selectedBranch.id} // <-- Pasamos de forma garantizada el id limpio de la sucursal seleccionada
      />
    </div>
  );
}