'use client';

import { useState, useEffect } from 'react';
import { ApiClient } from '@maison/api-client';
import { EmptyState, Skeleton } from '@maison/ui';
import { IconBuilding } from '@maison/ui';
import type { Branch } from '@maison/types';

export default function SucursalesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setIsLoading(true);
        const response = await ApiClient.get<{ data: Branch[] }>('/admin/branches');
        setBranches(response.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar sucursales');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranches();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="font-display text-3xl font-medium text-maison-cream">Sucursales</h1>
        </header>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="font-display text-3xl font-medium text-maison-cream">Sucursales</h1>
        </header>
        <div className="card p-8 text-center">
          <p className="text-sm text-maison-ruby">{error}</p>
        </div>
      </div>
    );
  }

  if (!branches.length) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="font-display text-3xl font-medium text-maison-cream">Sucursales</h1>
          <p className="mt-1.5 text-sm text-maison-cream-muted">Gestión de ubicaciones</p>
        </header>
        <div className="card">
          <EmptyState
            icon={<IconBuilding className="h-6 w-6" />}
            title="Sin sucursales"
            description="No hay sucursales configuradas en el sistema."
            className="py-20"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-medium text-maison-cream">Sucursales</h1>
        <p className="mt-1.5 text-sm text-maison-cream-muted">Gestión de ubicaciones y configuración</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {branches.map((branch) => (
          <div key={branch.id} className="card p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1">
                <h3 className="font-medium text-maison-cream text-lg">{branch.name}</h3>
                {branch.description && (
                  <p className="text-xs text-maison-cream-muted mt-1">{branch.description}</p>
                )}
              </div>
              <span
                className={`badge text-xs font-medium px-2 py-1 rounded-full ${
                  branch.isActive
                    ? 'bg-maison-sage-bg text-maison-sage'
                    : 'bg-maison-ruby-bg text-maison-ruby'
                }`}
              >
                {branch.isActive ? 'Activa' : 'Inactiva'}
              </span>
            </div>

            {branch.address && (
              <p className="text-xs text-maison-cream-muted">{branch.address}</p>
            )}

            <div className="mt-4 pt-4 border-t border-maison-border">
              <p className="text-2xs text-maison-cream-dim">
                Creada: {new Date(branch.createdAt).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
