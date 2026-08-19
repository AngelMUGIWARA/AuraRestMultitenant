'use client';

import { useState, useEffect } from 'react';
import { AuthClient } from '@maison/auth-client';
import { apiClient } from '@maison/api-client';
import { EmptyState, Skeleton, IconUsers, IconPlus } from '@maison/ui';
import { UserModal } from '@/components/users/UserModal';
import type { User } from '@maison/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const isOwner = AuthClient.getRole() === 'OWNER';

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get<{ data: { data: User[] } }>('/admin/users');
      setUsers(response.data.data ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="font-display text-3xl font-medium text-maison-cream">Usuarios</h1>
        </header>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="font-display text-3xl font-medium text-maison-cream">Usuarios</h1>
        </header>
        <div className="card p-8 text-center">
          <p className="text-sm text-maison-ruby">{error}</p>
        </div>
      </div>
    );
  }

  if (!users.length) {
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-medium text-maison-cream">Usuarios</h1>
            <p className="mt-1.5 text-sm text-maison-cream-muted">Administración de acceso y roles</p>
          </div>
          {isOwner && (
            <button type="button" onClick={() => setModalOpen(true)} className="btn-primary self-start sm:self-auto">
              <IconPlus className="h-4 w-4" />Nuevo usuario
            </button>
          )}
        </header>
        <div className="card">
          <EmptyState
            icon={<IconUsers className="h-6 w-6" />}
            title="Sin usuarios"
            description="No hay usuarios registrados en el sistema."
            className="py-20"
          />
        </div>
        <UserModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchUsers} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium text-maison-cream">Usuarios</h1>
          <p className="mt-1.5 text-sm text-maison-cream-muted">Administración de acceso y permisos</p>
        </div>
        {isOwner && (
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary self-start sm:self-auto">
            <IconPlus className="h-4 w-4" />Nuevo usuario
          </button>
        )}
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-maison-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-maison-cream-muted">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-maison-cream-muted">Email</th>
              <th className="px-4 py-3 text-left font-medium text-maison-cream-muted">Rol</th>
              <th className="px-4 py-3 text-left font-medium text-maison-cream-muted">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-maison-cream-muted">Sucursal</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-maison-border hover:bg-surface-2">
                <td className="px-4 py-3 text-maison-cream">{user.name || 'Sin nombre'}</td>
                <td className="px-4 py-3 text-maison-cream-muted">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="badge text-xs font-medium px-2 py-1 rounded bg-maison-amber-glow text-maison-amber">
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium ${
                      user.status === 'ACTIVE' ? 'text-maison-sage' : 'text-maison-ruby'
                    }`}
                  >
                    {user.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-maison-cream-muted">{user.branchName ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UserModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchUsers} />
    </div>
  );
}
