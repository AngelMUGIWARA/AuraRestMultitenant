'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { loadRemote } from '@module-federation/runtime';
import { initFederation, MFE_URLS } from '@/lib/federation';
import { loadRemoteDynamically } from '@/lib/loadRemote';
import { Skeleton } from '@maison/ui';

// List of remotes that are pre-registered in initFederation()
const PRE_REGISTERED_REMOTES = new Set([
  'core_auth_dashboard_mf',
  'orders_tables_mf',
  'reservations_reports_mf',
  'menu_mf',
  'kitchen_mf',
  'cashier_mf',
]);

// ✅ Configuración de retry y timeouts
const LOAD_TIMEOUT = 30000;     // 30 segundos para cargar remoteEntry.js
const RETRY_ATTEMPTS = 3;       // Reintentar 3 veces
const RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s

// Maps remote names to their expected URL for the error message
const REMOTE_PORT_MAP: Record<string, string> = {
  core_auth_dashboard_mf:  MFE_URLS.core_auth_dashboard,
  orders_tables_mf:        MFE_URLS.orders_tables,
  reservations_reports_mf: MFE_URLS.reservations_reports,
  kitchen_mf:              MFE_URLS.kitchen_mf,
  cashier_mf:              MFE_URLS.cashier_mf,
  menu_mf:                 MFE_URLS.menu_mf,
};

interface RemoteLoaderProps {
  /** Nombre del remote registrado en initFederation (ej. 'core_auth_dashboard_mf') */
  remote: string;
  /** Path expuesto en el vite.config del MFE (ej. './AuthApp') */
  module: string;
  /** Si es true, carga el remoto bajo demanda (lazy loading) */
  lazy?: boolean;
}

export function RemoteLoader({ remote, module: mod, lazy = false }: RemoteLoaderProps) {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(1);

  useEffect(() => {
    initFederation();

    const expose = mod.startsWith('./') ? mod.slice(2) : mod;
    let timeoutId: NodeJS.Timeout | null = null;
    let cancelled = false;

    // ✅ Función con retry automático
    const loadModule = async (retryAttempt = 1): Promise<void> => {
      try {
        // ✅ Crear timeout para evitar espera infinita
        const controller = new AbortController();
        timeoutId = setTimeout(() => {
          controller.abort();
        }, LOAD_TIMEOUT);

        let moduleExport: { default?: ComponentType } | null;

        // Use dynamic loading for lazy remotes OR if remote is not pre-registered
        const shouldUseDynamicLoading = lazy || !PRE_REGISTERED_REMOTES.has(remote);

        if (shouldUseDynamicLoading) {
          // Cargar dinámicamente para remotos lazy o no pre-registrados
          moduleExport = await loadRemoteDynamically(remote, `./${expose}`);
        } else {
          // Cargar de manera estándar para remotos eager y pre-registrados
          moduleExport = await loadRemote<{ default?: ComponentType }>(`${remote}/${expose}`);
        }

        if (timeoutId) clearTimeout(timeoutId);

        if (cancelled) return;

        if (moduleExport?.default) {
          setComponent(() => moduleExport.default as ComponentType);
          setError(null);
        } else {
          throw new Error(`${remote}/${mod} no exporta un componente default.`);
        }
      } catch (err: unknown) {
        if (timeoutId) clearTimeout(timeoutId);

        if (cancelled) return;

        const errorMsg = err instanceof Error ? err.message : 'Error al cargar el módulo remoto.';
        setAttempt(retryAttempt);

        // ✅ Retry automático con backoff exponencial
        if (retryAttempt < RETRY_ATTEMPTS) {
          const delay = RETRY_DELAYS[retryAttempt - 1] || 5000;
          console.warn(
            `Error cargando ${remote}/${mod} (intento ${retryAttempt}/${RETRY_ATTEMPTS}): ${errorMsg}. Reintentando en ${delay}ms...`
          );

          // Esperar antes de reintentar
          await new Promise(resolve => {
            timeoutId = setTimeout(resolve, delay);
          });

          if (!cancelled) {
            return loadModule(retryAttempt + 1);
          }
          return;
        }

        // ✅ Después de todos los reintentos fallidos
        setError(
          `No se pudo cargar ${remote} después de ${RETRY_ATTEMPTS} intentos: ${errorMsg}`
        );
      }
    };

    loadModule(1);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [remote, mod, lazy]);

  if (error) {
    const expectedUrl = REMOTE_PORT_MAP[remote] ?? 'desconocido';
    return (
      <div className="card p-8 text-center space-y-3">
        <p className="text-sm font-medium text-maison-ruby">Error al cargar módulo remoto</p>
        <p className="font-mono text-xs text-maison-cream-dim">{error}</p>
        <p className="text-xs text-maison-cream-muted">
          Verifica que <strong>{remote}</strong> esté corriendo en{' '}
          <code className="font-mono">{expectedUrl.replace('/remoteEntry.js', '')}</code>
        </p>
        {/* ✅ Botón para reintentar manualmente */}
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-3 py-1.5 text-xs font-medium bg-maison-amber text-black rounded hover:bg-opacity-90 transition-opacity"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="flex flex-col gap-7 animate-fade-in">
        {/* ✅ Mostrar intento actual si es retry */}
        {attempt > 1 && (
          <p className="text-xs text-maison-cream-muted text-center">
            Cargando (intento {attempt}/{RETRY_ATTEMPTS})...
          </p>
        )}
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
