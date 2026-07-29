'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { systemAdminTenantsService } from '@/services/system-admin-tenants.service';
import type { Tenant, TenantPlan, TenantOwnerCredentials } from '@maison/types';

const STATUS_BADGE: Record<Tenant['status'], string> = {
  ACTIVE: 'badge-active',
  INACTIVE: 'badge-inactive',
  SUSPENDED: 'badge-suspended',
};

const PLAN_OPTIONS: TenantPlan[] = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];

interface CredentialsBanner {
  title: string;
  credentials: TenantOwnerCredentials;
}

export default function SystemAdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [credentialsBanner, setCredentialsBanner] = useState<CredentialsBanner | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    email: '',
    ownerName: '',
    ownerEmail: '',
    plan: 'FREE' as TenantPlan,
  });

  async function loadTenants() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await systemAdminTenantsService.getAll();
      setTenants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar tenants');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTenants();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    try {
      const result = await systemAdminTenantsService.create(form);
      setCredentialsBanner({ title: 'Tenant creado. Credenciales del OWNER', credentials: result.owner });
      setShowForm(false);
      setForm({ name: '', slug: '', email: '', ownerName: '', ownerEmail: '', plan: 'FREE' });
      await loadTenants();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error al crear el tenant');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSuspend(id: string) {
    const reason = window.prompt('Motivo de la suspensión (opcional):') ?? undefined;
    await systemAdminTenantsService.suspend(id, { reason });
    await loadTenants();
  }

  async function handleActivate(id: string) {
    await systemAdminTenantsService.activate(id);
    await loadTenants();
  }

  async function handleResetOwnerPassword(id: string, tenantName: string) {
    if (!window.confirm(`Esto invalida la contraseña actual del OWNER de "${tenantName}" y genera una nueva. ¿Continuar?`)) {
      return;
    }
    setResettingId(id);
    try {
      const credentials = await systemAdminTenantsService.resetOwnerPassword(id);
      setCredentialsBanner({ title: `Contraseña restablecida para "${tenantName}"`, credentials });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error al restablecer la contraseña');
    } finally {
      setResettingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-maison-cream">Tenants</h1>
          <p className="mt-1 text-sm text-maison-cream-muted">Restaurantes registrados en la plataforma</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-maison-amber px-4 py-2 text-sm font-medium text-surface-0 hover:bg-maison-amber/90 transition"
        >
          {showForm ? 'Cancelar' : '+ Nuevo tenant'}
        </button>
      </header>

      {credentialsBanner && (
        <div className="rounded-lg border border-maison-amber/40 bg-maison-amber/10 px-4 py-3 flex items-start justify-between gap-4">
          <div className="text-sm text-maison-cream">
            <p className="font-medium">{credentialsBanner.title} (solo se muestran una vez):</p>
            <p className="mt-1 font-mono text-xs text-maison-cream-muted">
              {credentialsBanner.credentials.email} / {credentialsBanner.credentials.temporaryPassword}
            </p>
            <p className="mt-1 text-2xs text-maison-cream-dim">
              Se le pedirá cambiarla en su próximo inicio de sesión.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCredentialsBanner(null)}
            className="text-xs text-maison-cream-dim hover:text-maison-cream"
          >
            Cerrar
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre del restaurante" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field
              label="Slug"
              value={form.slug}
              onChange={(v) => setForm({ ...form, slug: v.toLowerCase().replace(/\s+/g, '-') })}
              placeholder="mi-restaurante"
              required
            />
            <Field label="Email del restaurante" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
            <div className="space-y-1">
              <label className="text-xs font-medium text-maison-cream-dim uppercase tracking-wider">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value as TenantPlan })}
                className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-maison-cream"
              >
                {PLAN_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <Field label="Nombre del OWNER" value={form.ownerName} onChange={(v) => setForm({ ...form, ownerName: v })} required />
            <Field label="Email del OWNER" type="email" value={form.ownerEmail} onChange={(v) => setForm({ ...form, ownerEmail: v })} required />
          </div>

          {createError && (
            <div className="rounded-lg bg-maison-ruby/10 border border-maison-ruby/30 px-3 py-2">
              <p className="text-xs text-maison-ruby">{createError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isCreating}
            className="rounded-lg bg-maison-amber px-4 py-2 text-sm font-medium text-surface-0 hover:bg-maison-amber/90 transition disabled:opacity-50"
          >
            {isCreating ? 'Aprovisionando… (crea schema + migra + siembra OWNER)' : 'Crear tenant'}
          </button>
        </form>
      )}

      <section className="card">
        <div className="border-b border-maison-border px-5 py-3.5">
          <h2 className="text-sm font-medium text-maison-cream">Listado</h2>
        </div>
        {isLoading && <p className="px-5 py-6 text-sm text-maison-cream-muted">Cargando…</p>}
        {!isLoading && error && <p className="px-5 py-6 text-sm text-maison-ruby">{error}</p>}
        {!isLoading && !error && tenants.length === 0 && (
          <p className="px-5 py-6 text-sm text-maison-cream-muted">Sin tenants registrados todavía.</p>
        )}
        {!isLoading && !error && tenants.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-maison-border bg-surface-2">
                  <th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Nombre</th>
                  <th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Slug</th>
                  <th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Plan</th>
                  <th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Estado</th>
                  <th className="px-4 py-2.5 text-left font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Creado</th>
                  <th className="px-4 py-2.5 text-right font-medium uppercase tracking-widest text-maison-cream-dim text-2xs">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b border-maison-border last:border-b-0 hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 font-medium text-maison-cream">{t.name}</td>
                    <td className="px-4 py-3 font-mono text-maison-cream-muted">{t.slug}</td>
                    <td className="px-4 py-3 text-maison-cream-muted">{t.plan}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-maison-cream-dim">{new Date(t.createdAt).toLocaleDateString('es-MX')}</td>
                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleResetOwnerPassword(t.id, t.name)}
                        disabled={resettingId === t.id}
                        className="text-maison-cream-muted hover:text-maison-cream hover:underline disabled:opacity-50"
                      >
                        {resettingId === t.id ? 'Restableciendo…' : 'Restablecer contraseña'}
                      </button>
                      {t.status === 'SUSPENDED' ? (
                        <button type="button" onClick={() => handleActivate(t.id)} className="text-maison-amber hover:underline">
                          Activar
                        </button>
                      ) : (
                        <button type="button" onClick={() => handleSuspend(t.id)} className="text-maison-ruby hover:underline">
                          Suspender
                        </button>
                      )}
                    </td>
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

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-maison-cream-dim uppercase tracking-wider">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-maison-cream placeholder:text-maison-cream-muted focus:outline-none focus:border-maison-amber/50 focus:ring-1 focus:ring-maison-amber/30 transition"
      />
    </div>
  );
}
