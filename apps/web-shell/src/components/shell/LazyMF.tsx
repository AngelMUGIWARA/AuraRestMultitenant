'use client';

import { Suspense } from 'react';
import { RemoteLoader } from './RemoteLoader';
import { Skeleton } from '@maison/ui';

interface LazyMFProps {
  /** Nombre del remote (ej. 'core_auth_dashboard_mf') */
  remote: string;
  /** Módulo a cargar (ej. './DashboardApp') */
  module: string;
  /** Si es true, el remoto se carga bajo demanda */
  lazy?: boolean;
}

/**
 * Componente genérico para cargar remotos con Suspense y fallback.
 * Soporta carga eager y lazy (bajo demanda).
 */
export function LazyMF({ remote, module, lazy = false }: LazyMFProps) {
  return (
    <Suspense
      fallback={
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
      }
    >
      <RemoteLoader remote={remote} module={module} lazy={lazy} />
    </Suspense>
  );
}
