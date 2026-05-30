import { useState } from 'react';
import { useBranch } from '../context/BranchContext';
import { useUsers } from '../hooks/useUsers';
import { formatNumber, getInitials, formatRelativeTime, cn } from '../utils';
import { StatCard, StatCardSkeleton } from '@maison/ui';
import { Skeleton, SkeletonAvatar } from '@maison/ui';
import { EmptyState } from '@maison/ui';
import {
  IconUsers, IconShield, IconBriefcase, IconMail,
  IconPlus, IconRefresh, IconSearch, IconUsers2,
  IconMoreHorizontal,
} from '@maison/ui';
import type { User, UserRole, UserStatus } from "../types/user.types";

/* ─── Config ────────────────────────────────────────────────────── */

const ROLE_BADGE: Record<UserRole, string> = {
  super_admin: 'badge bg-maison-ruby-bg text-maison-ruby',
  admin: 'badge bg-maison-amber-glow text-maison-amber',
  manager: 'badge bg-maison-gold-bg text-maison-gold',
  staff: 'badge badge-inactive',
};

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
};

const ROLE_ICON: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  super_admin: IconShield,
  admin: IconShield,
  manager: IconBriefcase,
  staff: IconUsers,
};

const STATUS_BADGE: Record<UserStatus, string> = {
  active: 'badge-active',
  inactive: 'badge-inactive',
  pending: 'badge bg-maison-gold-bg text-maison-gold',
};

const STATUS_LABEL: Record<UserStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  pending: 'Pendiente',
};

const ROLE_FILTERS: { value: UserRole | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
];

/* ─── User row ──────────────────────────────────────────────────── */

function UserRow({ user }: { user: User }) {
  const RoleIcon = ROLE_ICON[user.role];

  return (
    <tr className="border-b border-maison-border last:border-b-0 transition-colors hover:bg-surface-2">
      {/* Usuario */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: 'linear-gradient(140deg, rgb(var(--color-accent-dim)) 0%, rgb(var(--color-accent)) 100%)' }}
            aria-hidden="true"
          >
            {getInitials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-maison-cream">{user.name}</p>
            <p className="flex items-center gap-1 truncate text-2xs text-maison-cream-dim">
              <IconMail className="h-2.5 w-2.5 flex-shrink-0" />
              {user.email}
            </p>
          </div>
        </div>
      </td>

      {/* Rol */}
      <td className="px-5 py-3.5">
        <span className={cn('badge', ROLE_BADGE[user.role])}>
          <RoleIcon className="h-2.5 w-2.5" />
          {ROLE_LABEL[user.role]}
        </span>
      </td>

      {/* Sucursal */}
      <td className="hidden px-5 py-3.5 md:table-cell">
        <span className="text-xs text-maison-cream-muted">
          {user.branchName ?? user.tenantName ?? '—'}
        </span>
      </td>

      {/* Estado */}
      <td className="px-5 py-3.5">
        <span className={cn('badge', STATUS_BADGE[user.status])}>
          <span className="h-1 w-1 rounded-full bg-current" />
          {STATUS_LABEL[user.status]}
        </span>
      </td>

      {/* Último acceso */}
      <td className="hidden px-5 py-3.5 text-2xs text-maison-cream-dim lg:table-cell">
        {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'Nunca'}
      </td>

      {/* Acciones */}
      <td className="px-5 py-3.5">
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded text-maison-cream-dim transition-colors hover:bg-surface-3 hover:text-maison-cream"
          aria-label={`Opciones para ${user.name}`}
        >
          <IconMoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

function UserRowSkeleton() {
  return (
    <tr className="border-b border-maison-border last:border-b-0" aria-hidden="true">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <SkeletonAvatar size="sm" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-36" />
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
      <td className="hidden px-5 py-3.5 md:table-cell"><Skeleton className="h-3 w-24" /></td>
      <td className="px-5 py-3.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
      <td className="hidden px-5 py-3.5 lg:table-cell"><Skeleton className="h-2.5 w-20" /></td>
      <td className="px-5 py-3.5"><Skeleton className="h-6 w-6 rounded" /></td>
    </tr>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function UsersPage() {
  const { selectedBranch } = useBranch();
  const { stats, users, isLoading, error, filters, setFilters, refresh } = useUsers(
    selectedBranch.id,
  );
  const [activeRole, setActiveRole] = useState<UserRole | 'all'>('all');
  const hasError = !!error;

  function handleRoleFilter(val: UserRole | 'all') {
    setActiveRole(val);
    setFilters({ role: val === 'all' ? undefined : val });
  }

  return (
    <div className="flex flex-col gap-7 animate-fade-in">

      {/* ── Page Header ──────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium leading-none text-maison-cream">
            Usuarios
          </h1>
          <p className="mt-1.5 text-sm text-maison-cream-muted">
            {selectedBranch.isGlobal
              ? 'Control de accesos y roles — Plataforma completa'
              : `Usuarios de ${selectedBranch.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button type="button" onClick={refresh} className="btn-ghost" disabled={isLoading}>
            <IconRefresh className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
          <button type="button" className="btn-primary">
            <IconPlus className="h-4 w-4" />
            Invitar usuario
          </button>
        </div>
      </header>

      {/* ── Métricas Primero ─────────────────────────────────── */}
      <section aria-labelledby="users-kpis">
        <h2 id="users-kpis" className="sr-only">Métricas de usuarios</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
          ) : (
            <>
              <StatCard
                label="Total usuarios"
                value={stats ? formatNumber(stats.totalUsers) : '—'}
                delta={stats ? `${formatNumber(stats.newThisMonth)} nuevos este mes` : undefined}
                deltaPositive
                deltaLabel=""
                icon={<IconUsers className="h-3.5 w-3.5" />}
                colorVariant="cream"
              />
              <StatCard
                label="Activos"
                value={stats ? formatNumber(stats.activeUsers) : '—'}
                delta={stats && stats.totalUsers > 0
                  ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}%`
                  : undefined}
                deltaPositive
                deltaLabel="del total"
                icon={<IconUsers2 className="h-3.5 w-3.5" />}
                colorVariant="sage"
              />
              <StatCard
                label="Administradores"
                value={stats ? formatNumber(stats.adminCount) : '—'}
                icon={<IconShield className="h-3.5 w-3.5" />}
                colorVariant="amber"
              />
              <StatCard
                label="Staff"
                value={stats ? formatNumber(stats.staffCount) : '—'}
                delta={stats ? `${formatNumber(stats.managerCount)} managers` : undefined}
                deltaPositive
                deltaLabel=""
                icon={<IconBriefcase className="h-3.5 w-3.5" />}
                colorVariant="gold"
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
            placeholder="Buscar por nombre o email..."
            value={filters.search ?? ''}
            onChange={(e) => setFilters({ search: e.target.value || undefined })}
            className="input-base w-full pl-8"
            aria-label="Buscar usuarios"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por rol">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => handleRoleFilter(f.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                activeRole === f.value
                  ? 'border-maison-amber bg-maison-amber-glow text-maison-amber'
                  : 'border-maison-border bg-surface-1 text-maison-cream-muted hover:bg-surface-2',
              )}
              aria-pressed={activeRole === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Users table ──────────────────────────────────────── */}
      <section className="card overflow-hidden" aria-labelledby="users-table-title">
        <div className="flex items-center justify-between border-b border-maison-border px-5 py-3.5">
          <div>
            <h2 id="users-table-title" className="text-sm font-medium text-maison-cream">
              Listado de Usuarios
            </h2>
            {!isLoading && users && (
              <p className="mt-0.5 text-2xs text-maison-cream-dim">
                {formatNumber(users.meta.total)} usuarios encontrados
              </p>
            )}
          </div>
        </div>

        {!isLoading && (hasError || !users?.data?.length) && (
          <EmptyState
            icon={<IconUsers className="h-6 w-6" />}
            title={hasError ? 'No se pudieron cargar los usuarios' : 'Sin usuarios'}
            description={
              hasError
                ? 'Verifica la conexión con el API del servidor.'
                : 'No hay usuarios que coincidan con los filtros aplicados.'
            }
            className="py-16"
          />
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs" aria-labelledby="users-table-title">
            {!isLoading && users?.data && users.data.length > 0 && (
              <thead>
                <tr className="border-b border-maison-border bg-surface-2">
                  {[
                    { label: 'Usuario', className: '' },
                    { label: 'Rol', className: '' },
                    { label: 'Sucursal', className: 'hidden md:table-cell' },
                    { label: 'Estado', className: '' },
                    { label: 'Último acceso', className: 'hidden lg:table-cell' },
                    { label: '', className: 'w-10' },
                  ].map((col) => (
                    <th
                      key={col.label || 'actions'}
                      scope="col"
                      className={cn(
                        'px-5 py-2.5 text-left text-2xs font-medium uppercase tracking-widest text-maison-cream-dim',
                        col.className,
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <UserRowSkeleton key={i} />)
                : users?.data?.map((user) => <UserRow key={user.id} user={user} />)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
