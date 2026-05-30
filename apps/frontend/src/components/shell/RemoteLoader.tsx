'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { loadRemote } from '@module-federation/runtime';
import { initFederation } from '@/lib/federation';
import { Skeleton } from '@maison/ui';

interface RemoteLoaderProps {
  /** Nombre del remote registrado en initFederation (ej. 'mfe_admin') */
  remote: string;
  /** Path expuesto en el vite.config del MFE (ej. './App') */
  module: string;
}

export function RemoteLoader({ remote, module: mod }: RemoteLoaderProps) {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initFederation();

    const expose = mod.startsWith('./') ? mod.slice(2) : mod;
    loadRemote<{ default: ComponentType }>(`${remote}/${expose}`)
      .then((m) => {
        if (m?.default) {
          setComponent(() => m.default);
        } else {
          setError(`${remote}/${mod} no exporta un componente default.`);
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error al cargar el módulo remoto.');
      });
  }, [remote, mod]);

  if (error) {
    return (
      <div className="card p-8 text-center space-y-2">
        <p className="text-sm font-medium text-maison-ruby">Error al cargar módulo remoto</p>
        <p className="font-mono text-xs text-maison-cream-dim">{error}</p>
        <p className="text-xs text-maison-cream-muted">
          Verifica que el MFE esté corriendo en{' '}
          {process.env.NEXT_PUBLIC_MFE_ADMIN_URL ?? 'http://localhost:5002'}.
        </p>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="flex flex-col gap-7 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
        <Skeleton className="h-56 rounded-lg" />
      </div>
    );
  }

  return <Component />;
}
