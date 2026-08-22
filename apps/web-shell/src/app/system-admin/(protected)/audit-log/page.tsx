'use client';

import { useEffect, useState } from 'react';
import { systemAdminAuditLogService } from '@/services/system-admin-audit-log.service';
import { systemAdminTenantsService } from '@/services/system-admin-tenants.service';
import type { SystemAuditLogEntry } from '@maison/types';

const ACTION_META: Record<string, { label: string; badge: string }> = {
  TENANT_CREATED: { label: 'Tenant creado', badge: 'badge-active' },
  TENANT_ACTIVATED: { label: 'Tenant reactivado', badge: 'badge-active' },
  TENANT_SUSPENDED: { label: 'Tenant suspendido', badge: 'badge-suspended' },
  TENANT_PLAN_CHANGED: { label: 'Plan modificado', badge: 'badge-trial' },
  TENANT_UPDATED: { label: 'Datos editados', badge: 'badge-inactive' },
  OWNER_PASSWORD_RESET: { label: 'Contraseña restablecida', badge: 'badge-inactive' },
};

function actionMeta(action: string) {
  return ACTION_META[action] ?? { label: action, badge: 'badge-inactive' };
}

function describeEntry(entry: SystemAuditLogEntry, tenantName: string | null): string {
  const meta = (entry.metadata ?? {}) as Record<string, unknown>;
  const name = tenantName ? `"${tenantName}"` : entry.targetId ? `del tenant #${entry.targetId}` : 'de un tenant';

  switch (entry.action) {
    case 'TENANT_CREATED': {
      const slug = typeof meta.slug === 'string' ? meta.slug : null;
      return `Se creó el tenant ${name}${slug ? ` (slug: ${slug})` : ''}.`;
    }
    case 'TENANT_ACTIVATED':
      return `Se reactivó el tenant ${name}.`;
    case 'TENANT_SUSPENDED': {
      const reason = typeof meta.reason === 'string' && meta.reason.trim() ? meta.reason : null;
      return `Se suspendió el tenant ${name}${reason ? ` — Motivo: ${reason}` : ' (sin motivo especificado)'}.`;
    }
    case 'TENANT_PLAN_CHANGED': {
      const prev = typeof meta.previousPlan === 'string' ? meta.previousPlan : '?';
      const next = typeof meta.nextPlan === 'string' ? meta.nextPlan : '?';
      return `El plan del tenant ${name} cambió de ${prev} a ${next}.`;
    }
    case 'TENANT_UPDATED': {
      const fields = Array.isArray(meta.fields) ? (meta.fields as string[]) : [];
      return `Se editaron los datos del tenant ${name}${fields.length ? ` (${fields.join(', ')})` : ''}.`;
    }
    case 'OWNER_PASSWORD_RESET': {
      const ownerEmail = typeof meta.ownerEmail === 'string' ? meta.ownerEmail : null;
      return `Se restableció la contraseña del OWNER ${name}${ownerEmail ? ` (${ownerEmail})` : ''}.`;
    }
    default:
      return `${entry.action} sobre ${entry.targetType.toLowerCase()}${entry.targetId ? ` #${entry.targetId}` : ''}.`;
  }
}

export default function SystemAdminAuditLogPage() {
  const [entries, setEntries] = useState<SystemAuditLogEntry[]>([]);
  const [tenantNames, setTenantNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      systemAdminAuditLogService.getAll(),
      systemAdminTenantsService.getAll().catch(() => []),
    ])
      .then(([logEntries, tenants]) => {
        setEntries(logEntries);
        setTenantNames(Object.fromEntries(tenants.map((t) => [t.id, t.name])));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar el log'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-medium text-maison-cream">Auditoría</h1>
        <p className="mt-1 text-sm text-maison-cream-muted">
          Historial de acciones realizadas desde el panel de Super Admin, en lenguaje simple.
        </p>
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
                  <th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Evento</th>
                  <th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Qué pasó</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const meta = actionMeta(entry.action);
                  const tenantName = entry.targetId ? tenantNames[entry.targetId] ?? null : null;
                  return (
                    <tr key={entry.id} className="border-b border-maison-border last:border-b-0 hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-maison-cream-dim">
                        {new Date(entry.createdAt).toLocaleString('es-MX', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`badge ${meta.badge}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-3 text-maison-cream">{describeEntry(entry, tenantName)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
