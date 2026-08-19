import { useState } from 'react';
import { AuthClient } from '@maison/auth-client';
import { useUsers } from '../hooks/useUsers';
import { formatNumber, cn } from '../utils';
import { StatCard, StatCardSkeleton, SkeletonRow, EmptyState, IconUsers, IconPlus, IconEdit, IconPower, Modal } from '@maison/ui';
import { UserModal } from '../components/users/UserModal';
import { usersService } from '../services/users.service';
import type { UserRole, UserStatus, User } from '@maison/types';

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Dueño',
  MANAGER: 'Gerente',
  WAITER: 'Mesero',
  CASHIER: 'Cajero',
  CHEF: 'Chef',
  KITCHEN_STAFF: 'Cocina',
  SUPER_ADMIN: 'Super Admin',
};
const STATUS_BADGE: Record<UserStatus, string> = { ACTIVE: 'badge-active', INACTIVE: 'badge-inactive', SUSPENDED: 'badge bg-maison-gold-bg text-maison-gold' };
const STATUS_LABEL: Record<UserStatus, string> = { ACTIVE: 'Activo', INACTIVE: 'Inactivo', SUSPENDED: 'Suspendido' };

export default function UsersPage() {
  const { stats, users, isLoading, error, refresh } = useUsers();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const hasError = !!error;
  const isOwner = AuthClient.getRole() === 'OWNER';

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleToggleStatus = async (userId: string, currentStatus: UserStatus) => {
    if (currentStatus === 'SUSPENDED') return;

    const newStatus: UserStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setDeactivatingUserId(currentStatus === 'ACTIVE' ? userId : null);
  };

  const confirmDeactivation = async (userId: string) => {
    setIsDeactivating(true);
    try {
      await usersService.deactivate(userId);
      await refresh();
    } catch (err) {
      console.error('Error deactivating user:', err);
    } finally {
      setIsDeactivating(false);
      setDeactivatingUserId(null);
    }
  };

  const handleActivate = async (userId: string) => {
    setIsDeactivating(true);
    try {
      await usersService.update(userId, { status: 'ACTIVE' });
      await refresh();
    } catch (err) {
      console.error('Error activating user:', err);
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="flex flex-col gap-7 animate-fade-in">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">Usuarios</h1>
          <p className="mt-1.5 text-sm text-maison-cream-muted">Gestión de accesos y roles de la plataforma</p>
        </div>
        {isOwner && (
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary self-start sm:self-auto">
            <IconPlus className="h-4 w-4" />Nuevo usuario
          </button>
        )}
      </header>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></> : <>
          <StatCard label="Total usuarios" value={stats ? formatNumber(stats.totalUsers) : '—'} icon={<IconUsers className="h-3.5 w-3.5" />} colorVariant="cream" />
          <StatCard label="Activos" value={stats ? formatNumber(stats.activeUsers) : '—'} deltaPositive icon={<IconUsers className="h-3.5 w-3.5" />} colorVariant="sage" />
          <StatCard label="Admins" value={stats ? formatNumber(stats.adminCount) : '—'} icon={<IconUsers className="h-3.5 w-3.5" />} colorVariant="amber" />
          <StatCard label="Nuevos este mes" value={stats ? formatNumber(stats.newThisMonth) : '—'} deltaPositive icon={<IconUsers className="h-3.5 w-3.5" />} colorVariant="gold" />
        </>}
      </section>
      <section className="card">
        <div className="border-b border-maison-border px-5 py-3.5"><h2 className="text-sm font-medium text-maison-cream">Listado de usuarios</h2></div>
        {isLoading && <div aria-hidden="true">{Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={6} />)}</div>}
        {!isLoading && (hasError || !users?.data?.length) && <EmptyState icon={<IconUsers className="h-6 w-6" />} title={hasError ? 'Error al cargar usuarios' : 'Sin usuarios'} description="Los usuarios aparecerán aquí cuando el API esté disponible." className="py-16" />}
        {!isLoading && !hasError && users?.data && users.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-maison-border bg-surface-2"><th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Usuario</th><th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Rol</th><th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Estado</th><th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Sucursal</th><th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Último acceso</th><th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Acciones</th></tr></thead>
              <tbody>{users.data.map((u) => (
                <tr key={u.id} className="border-b border-maison-border last:border-b-0 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3"><p className="font-medium text-maison-cream">{u.name}</p><p className="text-2xs text-maison-cream-dim">{u.email}</p></td>
                  <td className="px-4 py-3 text-maison-cream-muted">{ROLE_LABEL[u.role]}</td>
                  <td className="px-4 py-3"><span className={cn('badge', STATUS_BADGE[u.status])}><span className="h-1 w-1 rounded-full bg-current" />{STATUS_LABEL[u.status]}</span></td>
                  <td className="px-4 py-3 text-maison-cream-muted">{u.branchName ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-maison-cream-dim">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('es-MX') : '—'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    {isOwner && u.role !== 'SUPER_ADMIN' && (
                      <>
                        <button
                          onClick={() => handleEdit(u)}
                          className="btn-icon-sm btn-icon-secondary"
                          title="Editar usuario"
                        >
                          <IconEdit className="h-4 w-4" />
                        </button>
                        {u.status === 'ACTIVE' ? (
                          <button
                            onClick={() => setDeactivatingUserId(u.id)}
                            disabled={isDeactivating}
                            className="btn-icon-sm btn-icon-secondary"
                            title="Desactivar usuario"
                          >
                            <IconPower className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(u.id)}
                            disabled={isDeactivating}
                            className="btn-icon-sm btn-icon-secondary"
                            title="Activar usuario"
                          >
                            <IconPower className="h-4 w-4 opacity-50" />
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <UserModal open={modalOpen} onClose={handleCloseModal} onSuccess={refresh} editingUser={editingUser} />

      <Modal open={!!deactivatingUserId} onClose={() => setDeactivatingUserId(null)} title="Desactivar usuario">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-maison-cream-muted">¿Estás seguro de que deseas desactivar este usuario? Se restringirá el acceso inmediatamente.</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeactivatingUserId(null)} className="btn-secondary" disabled={isDeactivating}>Cancelar</button>
            <button onClick={() => deactivatingUserId && confirmDeactivation(deactivatingUserId)} className="btn-destructive" disabled={isDeactivating}>
              {isDeactivating ? 'Desactivando...' : 'Desactivar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
