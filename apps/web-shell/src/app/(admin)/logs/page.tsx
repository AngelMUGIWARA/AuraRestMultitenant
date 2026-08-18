'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@maison/api-client';
import { Skeleton, EmptyState } from '@maison/ui';
import { IconLogs } from '@maison/ui';

interface ActivityLog {
  id: string;
  branchId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  changes?: string;
  createdAt: string;
}

interface ActivityLogPageData {
  data: ActivityLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PAGE_SIZE = 20;

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creación',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
  SOFT_DELETE: 'Desactivación',
  LOGIN: 'Inicio de sesión',
  LOGOUT: 'Cierre de sesión',
};

export default function LogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async (pageNumber: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get<ActivityLogPageData>('/admin/activity-logs', {
        params: { page: pageNumber, limit: PAGE_SIZE },
      });
      setLogs(response.data ?? []);
      setTotal(response.total ?? 0);
      setTotalPages(response.totalPages ?? 1);
      setPage(response.page ?? pageNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los registros');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page);
  }, [fetchLogs, page]);

  function formatDate(value: string) {
    return new Date(value).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function actionLabel(action: string) {
    return ACTION_LABELS[action] ?? action;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-medium leading-none text-maison-cream">
          Registros
        </h1>
        <p className="mt-1.5 text-sm text-maison-cream-muted">
          Auditoría y registro de eventos del sistema · {total} eventos
        </p>
      </header>

      {error && (
        <div className="card p-6 text-center">
          <p role="alert" className="text-sm text-maison-ruby">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !logs.length ? (
        <div className="card">
          <EmptyState
            icon={<IconLogs className="h-6 w-6" />}
            title="Sin registros"
            description="Aún no hay eventos registrados en el sistema."
            className="py-20"
          />
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-maison-border text-2xs uppercase tracking-widest text-maison-cream-dim">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Acción</th>
                  <th className="px-4 py-3 font-medium">Entidad</th>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Sucursal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-maison-border">
                {logs.map((log) => (
                  <tr key={log.id} className="text-sm">
                    <td className="px-4 py-2.5 font-mono text-xs text-maison-cream-dim">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="badge badge-active">{actionLabel(log.action)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-maison-cream">
                      {log.entity}
                      <span className="ml-1 font-mono text-xs text-maison-cream-dim">
                        {log.entityId}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-maison-cream-muted">
                      {log.userId}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-maison-cream-muted">
                      {log.branchId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-maison-cream-muted">
              Página {page} de {Math.max(totalPages, 1)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
