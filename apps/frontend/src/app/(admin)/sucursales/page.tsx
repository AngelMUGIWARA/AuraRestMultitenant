'use client';

import { useState } from 'react';
import type { Metadata } from 'next';
import { useBranches } from '@/hooks/useBranches';
import { formatNumber, getInitials, cn } from '@/lib/utils';
import { StatCard, StatCardSkeleton } from '@/components/admin/dashboard/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  IconTenants, IconMapPin, IconPhone, IconMail, IconPencil,
  IconUsers, IconPlus, IconRefresh, IconSearch,
} from '@/components/ui/Icons';
import type { Branch, BranchStatus } from '@/types/branch.types';

/* ─── Config ────────────────────────────────────────────────────── */

const STATUS_BADGE: Record<BranchStatus, string> = {
  active: 'badge-active',
  inactive: 'badge-inactive',
  maintenance: 'badge bg-maison-gold-bg text-maison-gold',
};

const STATUS_LABEL: Record<BranchStatus, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  maintenance: 'En mantenimiento',
};

const STATUS_FILTERS: { value: BranchStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'inactive', label: 'Inactivas' },
  { value: 'maintenance', label: 'Mantenimiento' },
];

/* ─── Branch card ───────────────────────────────────────────────── */

function BranchCard({ branch }: { branch: Branch }) {
  const status = branch.status ?? (branch.isActive ? 'active' : 'inactive');

  return (
    <article className="card card-hover flex flex-col gap-0 overflow-hidden">
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 border-b border-maison-border p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: 'linear-gradient(140deg, rgb(var(--color-accent-dim)) 0%, rgb(var(--color-accent)) 100%)' }}
            aria-hidden="true"
          >
            {getInitials(branch.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-maison-cream">{branch.name}</p>
            <p className="text-2xs text-maison-cream-dim">{branch.city}</p>
          </div>
        </div>
        <span className={cn('badge flex-shrink-0', STATUS_BADGE[status])}>
          <span className="h-1 w-1 rounded-full bg-current" />
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-2.5 p-4 text-xs">
        {branch.address && (
          <div className="flex items-start gap-2 text-maison-cream-muted">
            <IconMapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-maison-cream-dim" />
            <span className="line-clamp-2">{branch.address}</span>
          </div>
        )}
        {branch.phone && (
          <div className="flex items-center gap-2 text-maison-cream-muted">
            <IconPhone className="h-3.5 w-3.5 flex-shrink-0 text-maison-cream-dim" />
            <span>{branch.phone}</span>
          </div>
        )}
        {branch.email && (
          <div className="flex items-center gap-2 text-maison-cream-muted">
            <IconMail className="h-3.5 w-3.5 flex-shrink-0 text-maison-cream-dim" />
            <span className="truncate">{branch.email}</span>
          </div>
        )}
        {branch.managerName && (
          <div className="flex items-center gap-2 text-maison-cream-muted">
            <IconUsers className="h-3.5 w-3.5 flex-shrink-0 text-maison-cream-dim" />
            <span>{branch.managerName}</span>
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between border-t border-maison-border px-4 py-3">
        <div className="flex items-center gap-3 text-2xs text-maison-cream-dim">
          {branch.capacity && (
            <span>
              <span className="font-medium text-maison-cream">{branch.capacity}</span> personas
            </span>
          )}
          {branch.avgRating !== undefined && (
            <span className="text-maison-gold">★ {branch.avgRating.toFixed(1)}</span>
          )}
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded border border-maison-border bg-surface-2 px-2.5 py-1 text-2xs font-medium text-maison-cream-muted transition-colors hover:bg-surface-3 hover:text-maison-cream"
          aria-label={`Editar ${branch.name}`}
        >
          <IconPencil className="h-3 w-3" />
          Editar
        </button>
      </div>
    </article>
  );
}

function BranchCardSkeleton() {
  return (
    <div className="card flex flex-col gap-0 overflow-hidden" aria-hidden="true">
      <div className="flex items-start justify-between gap-3 border-b border-maison-border p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 flex-shrink-0 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 flex-shrink-0 rounded" />
            <Skeleton className="h-3 flex-1" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-maison-border px-4 py-3">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-6 w-16 rounded" />
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function SucursalesPage() {
  const { stats, branches, isLoading, error, filters, setFilters, refresh } = useBranches();
  const [activeStatus, setActiveStatus] = useState<BranchStatus | 'all'>('all');
  const hasError = !!error;

  function handleStatusFilter(val: BranchStatus | 'all') {
    setActiveStatus(val);
    setFilters({ status: val === 'all' ? undefined : val });
  }

  return (
    <div className="flex flex-col gap-7 animate-fade-in">

      {/* ── Page Header ──────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium leading-none text-maison-cream">
            Sucursales
          </h1>
          <p className="mt-1.5 text-sm text-maison-cream-muted">
            Gestión de sedes y ubicaciones de la plataforma
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button type="button" onClick={refresh} className="btn-ghost" disabled={isLoading}>
            <IconRefresh className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
          <button type="button" className="btn-primary">
            <IconPlus className="h-4 w-4" />
            Nueva sucursal
          </button>
        </div>
      </header>

      {/* ── Métricas Primero ─────────────────────────────────── */}
      <section aria-labelledby="branches-kpis">
        <h2 id="branches-kpis" className="sr-only">Métricas de sucursales</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
          ) : (
            <>
              <StatCard
                label="Total sucursales"
                value={stats ? formatNumber(stats.totalBranches) : '—'}
                icon={<IconTenants className="h-3.5 w-3.5" />}
                colorVariant="cream"
              />
              <StatCard
                label="Activas"
                value={stats ? formatNumber(stats.activeBranches) : '—'}
                delta={stats && stats.totalBranches > 0
                  ? `${Math.round((stats.activeBranches / stats.totalBranches) * 100)}%`
                  : undefined}
                deltaPositive
                deltaLabel="operativas"
                icon={<IconTenants className="h-3.5 w-3.5" />}
                colorVariant="sage"
              />
              <StatCard
                label="En mantenimiento"
                value={stats ? formatNumber(stats.maintenanceBranches) : '—'}
                icon={<IconTenants className="h-3.5 w-3.5" />}
                colorVariant="gold"
              />
              <StatCard
                label="Capacidad total"
                value={stats ? formatNumber(stats.totalCapacity) : '—'}
                deltaLabel="personas"
                icon={<IconUsers className="h-3.5 w-3.5" />}
                colorVariant="amber"
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
            placeholder="Buscar sucursal o ciudad..."
            value={filters.search ?? ''}
            onChange={(e) => setFilters({ search: e.target.value || undefined })}
            className="input-base w-full pl-8"
            aria-label="Buscar sucursales"
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
                  : 'border-maison-border bg-surface-1 text-maison-cream-muted hover:bg-surface-2',
              )}
              aria-pressed={activeStatus === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Branch cards grid ────────────────────────────────── */}
      <section aria-labelledby="branches-grid-title">
        <h2 id="branches-grid-title" className="sr-only">Listado de sucursales</h2>

        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <BranchCardSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && (hasError || !branches?.data?.length) && (
          <div className="card">
            <EmptyState
              icon={<IconTenants className="h-6 w-6" />}
              title={hasError ? 'No se pudieron cargar las sucursales' : 'Sin sucursales'}
              description={
                hasError
                  ? 'Verifica la conexión con el API del servidor.'
                  : 'Aún no hay sucursales registradas. Crea la primera para comenzar.'
              }
              action={
                !hasError ? (
                  <button type="button" className="btn-primary">
                    <IconPlus className="h-4 w-4" />
                    Crear primera sucursal
                  </button>
                ) : undefined
              }
              className="py-20"
            />
          </div>
        )}

        {!isLoading && !hasError && branches?.data && branches.data.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branches.data.map((branch) => (
              <BranchCard key={branch.id} branch={branch} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
