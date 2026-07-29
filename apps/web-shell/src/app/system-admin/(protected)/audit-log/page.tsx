'use client';

import { useEffect, useState } from 'react';
import { systemAdminAuditLogService } from '@/services/system-admin-audit-log.service';
import type { SystemAuditLogEntry } from '@maison/types';

export default function SystemAdminAuditLogPage() {
  const [entries, setEntries] = useState<SystemAuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    systemAdminAuditLogService
      .getAll()
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar el log'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-medium text-maison-cream">Auditoría</h1>
        <p className="mt-1 text-sm text-maison-cream-muted">Registro global de acciones del Super Admin</p>
      </header>

      <section className="card">
        {isLoading && <p className="px-5 py-6 text-sm text-maison-cream-muted">Cargando…</p>}
        {!isLoading && error && <p className="px-5 py-6 text-sm text-maison-ruby">{error}</p>}
        {!isLoading && !error && entries.length === 0 && (
          <p className="px-5 py-6 text-sm text-maison-cream-muted">Sin eventos registrados todavía.</p>
        )}
        {!isLoading && !error && entries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-maison-border bg-surface-2">
                  <th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Fecha</th>
                  <th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Acción</th>
                  <th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Objetivo</th>
                  <th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-maison-border last:border-b-0 hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 font-mono text-maison-cream-dim">{new Date(entry.createdAt).toLocaleString('es-MX')}</td>
                    <td className="px-4 py-3 font-medium text-maison-cream">{entry.action}</td>
                    <td className="px-4 py-3 text-maison-cream-muted">{entry.targetType}{entry.targetId ? ` · ${entry.targetId}` : ''}</td>
                    <td className="px-4 py-3 font-mono text-maison-cream-dim">{entry.metadata ? JSON.stringify(entry.metadata) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
