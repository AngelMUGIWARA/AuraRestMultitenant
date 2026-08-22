'use client';

import { Modal } from '@maison/ui';
import { systemAdminTenantsService } from '@/services/system-admin-tenants.service';
import type { Tenant, TenantOwnerCredentials, TenantPlan, TenantPlanUsage } from '@maison/types';
import { useEffect, useState, type FormEvent } from 'react';

const STATUS_BADGE: Record<Tenant['status'], string> = {
  ACTIVE: 'badge-active',
  INACTIVE: 'badge-inactive',
  SUSPENDED: 'badge-suspended',
};

const STATUS_LABEL: Record<Tenant['status'], string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  SUSPENDED: 'Suspendido',
};

const PLAN_OPTIONS: TenantPlan[] = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const LIMITS = {
  name: 100,
  slug: 60,
  email: 150,
  ownerName: 100,
  ownerEmail: 150,
};

interface CredentialsBanner {
  title: string;
  credentials: TenantOwnerCredentials;
}

interface ConfirmState {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  withReason?: boolean;
  onConfirm: (reason: string) => Promise<void> | void;
}

interface AlertState {
  title: string;
  message: string;
}

interface CreateForm {
  name: string;
  slug: string;
  email: string;
  ownerName: string;
  ownerEmail: string;
  plan: TenantPlan;
}

const EMPTY_CREATE_FORM: CreateForm = { name: '', slug: '', email: '', ownerName: '', ownerEmail: '', plan: 'FREE' };

function validateCreateForm(form: CreateForm): Record<string, string> {
  const errors: Record<string, string> = {};

  if (form.name.trim().length < 2) errors.name = 'Debe tener al menos 2 caracteres.';
  else if (form.name.length > LIMITS.name) errors.name = `No puede superar los ${LIMITS.name} caracteres.`;

  if (!SLUG_REGEX.test(form.slug)) errors.slug = 'Solo minúsculas, números y guiones (ej. mi-restaurante).';
  else if (form.slug.length > LIMITS.slug) errors.slug = `No puede superar los ${LIMITS.slug} caracteres.`;

  if (!EMAIL_REGEX.test(form.email)) errors.email = 'Correo inválido: debe llevar @ y un dominio (ej. nombre@dominio.com).';
  else if (form.email.length > LIMITS.email) errors.email = `No puede superar los ${LIMITS.email} caracteres.`;

  if (form.ownerName.trim().length < 2) errors.ownerName = 'Debe tener al menos 2 caracteres.';
  else if (form.ownerName.length > LIMITS.ownerName) errors.ownerName = `No puede superar los ${LIMITS.ownerName} caracteres.`;

  if (!EMAIL_REGEX.test(form.ownerEmail)) errors.ownerEmail = 'Correo inválido: debe llevar @ y un dominio (ej. nombre@dominio.com).';
  else if (form.ownerEmail.length > LIMITS.ownerEmail) errors.ownerEmail = `No puede superar los ${LIMITS.ownerEmail} caracteres.`;

  return errors;
}

interface EditForm {
  name: string;
  email: string;
  phone: string;
  address: string;
}

function validateEditForm(form: EditForm): Record<string, string> {
  const errors: Record<string, string> = {};

  if (form.name.trim().length < 2) errors.name = 'Debe tener al menos 2 caracteres.';
  else if (form.name.length > LIMITS.name) errors.name = `No puede superar los ${LIMITS.name} caracteres.`;

  if (!EMAIL_REGEX.test(form.email)) errors.email = 'Correo inválido: debe llevar @ y un dominio (ej. nombre@dominio.com).';
  else if (form.email.length > LIMITS.email) errors.email = `No puede superar los ${LIMITS.email} caracteres.`;

  if (form.phone.length > 30) errors.phone = 'No puede superar los 30 caracteres.';
  if (form.address.length > 255) errors.address = 'No puede superar los 255 caracteres.';

  return errors;
}

export default function SystemAdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const [credentialsBanner, setCredentialsBanner] = useState<CredentialsBanner | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [planUsage, setPlanUsage] = useState<Record<string, TenantPlanUsage>>({});
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);
  const [justCopied, setJustCopied] = useState(false);

  const [form, setForm] = useState<CreateForm>(EMPTY_CREATE_FORM);

  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', email: '', phone: '', address: '' });
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [confirmReason, setConfirmReason] = useState('');
  const [isConfirmBusy, setIsConfirmBusy] = useState(false);
  const [alertState, setAlertState] = useState<AlertState | null>(null);

  async function loadTenants() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await systemAdminTenantsService.getAll();
      setTenants(data);
      const usageEntries = await Promise.all(
        data.map(async (tenant) => {
          try {
            return [tenant.id, await systemAdminTenantsService.getPlanUsage(tenant.id)] as const;
          } catch {
            return null;
          }
        }),
      );
      setPlanUsage(Object.fromEntries(usageEntries.filter((entry): entry is readonly [string, TenantPlanUsage] => entry !== null)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar tenants');
    } finally {
      setIsLoading(false);
    }
  }

  function formatUsage(planUsage: TenantPlanUsage) {
    const limit = (value: number | null) => value === null ? '∞' : value;
    return `S ${planUsage.usage.branches}/${limit(planUsage.limits.branches)} · M ${planUsage.usage.menuItems}/${limit(planUsage.limits.menuItems)} · Staff ${planUsage.usage.staff}/${limit(planUsage.limits.staff)}`;
  }

  useEffect(() => {
    loadTenants();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const fieldErrors = validateCreateForm(form);
    setCreateFieldErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      setCreateError('Corrige los campos marcados antes de continuar.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      const result = await systemAdminTenantsService.create(form);
      setCredentialsBanner({ title: 'Tenant creado. Credenciales del OWNER', credentials: result.owner });
      setShowForm(false);
      setForm(EMPTY_CREATE_FORM);
      setCreateFieldErrors({});
      await loadTenants();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error al crear el tenant');
    } finally {
      setIsCreating(false);
    }
  }

  function handleSuspend(id: string, tenantName: string) {
    setConfirmReason('');
    setConfirmState({
      title: `Suspender "${tenantName}"`,
      description: 'El restaurante perderá acceso a la plataforma hasta que lo reactives. Puedes indicar un motivo (opcional).',
      confirmLabel: 'Suspender',
      danger: true,
      withReason: true,
      onConfirm: async (reason) => {
        await systemAdminTenantsService.suspend(id, { reason: reason.trim() || undefined });
        await loadTenants();
      },
    });
  }

  async function handleActivate(id: string) {
    await systemAdminTenantsService.activate(id);
    await loadTenants();
  }

  async function handlePlanChange(id: string, plan: TenantPlan) {
    const current = tenants.find((tenant) => tenant.id === id)?.plan;
    if (!current || current === plan) return;

    setUpdatingPlanId(id);
    try {
      const updated = await systemAdminTenantsService.updatePlan(id, plan);
      setTenants((currentTenants) => currentTenants.map((tenant) => (tenant.id === id ? updated : tenant)));
      const usage = await systemAdminTenantsService.getPlanUsage(id);
      setPlanUsage((currentUsage) => ({ ...currentUsage, [id]: usage }));
    } catch (err) {
      setAlertState({
        title: 'No se pudo cambiar el plan',
        message: err instanceof Error ? err.message : 'Error al cambiar el plan',
      });
    } finally {
      setUpdatingPlanId(null);
    }
  }

  function credentialsAsText(banner: CredentialsBanner): string {
    return [
      banner.title,
      `Correo: ${banner.credentials.email}`,
      `Contraseña temporal: ${banner.credentials.temporaryPassword}`,
      'Se le pedirá cambiarla en su próximo inicio de sesión.',
    ].join('\n');
  }

  async function handleCopyCredentials() {
    if (!credentialsBanner) return;
    await navigator.clipboard.writeText(credentialsAsText(credentialsBanner));
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  }

  function handleDownloadCredentials() {
    if (!credentialsBanner) return;
    const blob = new Blob([credentialsAsText(credentialsBanner)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credenciales-${credentialsBanner.credentials.email}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleResetOwnerPassword(id: string, tenantName: string) {
    setConfirmState({
      title: 'Restablecer contraseña',
      description: `Esto invalida la contraseña actual del OWNER de "${tenantName}" y genera una nueva.`,
      confirmLabel: 'Restablecer',
      danger: true,
      onConfirm: async () => {
        setResettingId(id);
        try {
          const credentials = await systemAdminTenantsService.resetOwnerPassword(id);
          setCredentialsBanner({ title: `Contraseña restablecida para "${tenantName}"`, credentials });
        } finally {
          setResettingId(null);
        }
      },
    });
  }

  async function handleConfirmAccept() {
    if (!confirmState) return;
    setIsConfirmBusy(true);
    try {
      await confirmState.onConfirm(confirmReason);
      setConfirmState(null);
    } catch (err) {
      setAlertState({
        title: 'Ocurrió un error',
        message: err instanceof Error ? err.message : 'Inténtalo de nuevo.',
      });
    } finally {
      setIsConfirmBusy(false);
    }
  }

  function openEdit(t: Tenant) {
    setEditingTenant(t);
    setEditForm({ name: t.name, email: t.email, phone: t.phone ?? '', address: t.address ?? '' });
    setEditFieldErrors({});
    setEditError(null);
  }

  function closeEdit() {
    setEditingTenant(null);
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingTenant) return;

    const fieldErrors = validateEditForm(editForm);
    setEditFieldErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      setEditError('Corrige los campos marcados antes de continuar.');
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    try {
      const updated = await systemAdminTenantsService.update(editingTenant.id, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone || undefined,
        address: editForm.address || undefined,
      });
      setTenants((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTenant(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error al actualizar el tenant');
    } finally {
      setIsSavingEdit(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-maison-cream">Restaurantes</h1>
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
          <div className="flex shrink-0 items-start gap-3">
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="text-xs text-maison-amber hover:underline"
            >
              {justCopied ? 'Copiado ✓' : 'Copiar'}
            </button>
            <button
              type="button"
              onClick={handleDownloadCredentials}
              className="text-xs text-maison-amber hover:underline"
            >
              Descargar .txt
            </button>
            <button
              type="button"
              onClick={() => setCredentialsBanner(null)}
              className="text-xs text-maison-cream-dim hover:text-maison-cream"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} noValidate className="card p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Nombre del restaurante"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              required
              maxLength={LIMITS.name}
              error={createFieldErrors.name}
            />
            <Field
              label="Slug"
              value={form.slug}
              onChange={(v) => setForm({ ...form, slug: v.toLowerCase().replace(/\s+/g, '-') })}
              placeholder="mi-restaurante"
              required
              maxLength={LIMITS.slug}
              error={createFieldErrors.slug}
            />
            <Field
              label="Correo del restaurante"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              required
              maxLength={LIMITS.email}
              error={createFieldErrors.email}
            />
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
            <Field
              label="Nombre del OWNER"
              value={form.ownerName}
              onChange={(v) => setForm({ ...form, ownerName: v })}
              required
              maxLength={LIMITS.ownerName}
              error={createFieldErrors.ownerName}
            />
            <Field
              label="Correo del OWNER"
              type="email"
              value={form.ownerEmail}
              onChange={(v) => setForm({ ...form, ownerEmail: v })}
              required
              maxLength={LIMITS.ownerEmail}
              error={createFieldErrors.ownerEmail}
            />
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
                    <td className="px-4 py-3">
                      <select
                        value={t.plan}
                        disabled={updatingPlanId === t.id}
                        onChange={(e) => handlePlanChange(t.id, e.target.value as TenantPlan)}
                        className="bg-surface-2 border border-white/10 rounded px-2 py-1 text-xs text-maison-cream disabled:opacity-50"
                        aria-label={`Plan de ${t.name}`}
                      >
                        {PLAN_OPTIONS.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                      </select>
                      {planUsage[t.id] && (
                        <p className="mt-1 text-2xs text-maison-cream-dim">
                          {formatUsage(planUsage[t.id])}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-maison-cream-dim">{new Date(t.createdAt).toLocaleDateString('es-MX')}</td>
                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(t)}
                        className="text-maison-cream-muted hover:text-maison-cream hover:underline"
                      >
                        Editar
                      </button>
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
                        <button type="button" onClick={() => handleSuspend(t.id, t.name)} className="text-maison-ruby hover:underline">
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

      <Modal
        open={editingTenant !== null}
        onClose={closeEdit}
        title={`Editar "${editingTenant?.name ?? ''}"`}
        description="Actualiza los datos de contacto del restaurante."
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={closeEdit}
              className="rounded-lg px-4 py-2 text-sm font-medium text-maison-cream-muted hover:text-maison-cream transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="edit-tenant-form"
              disabled={isSavingEdit}
              className="rounded-lg bg-maison-amber px-4 py-2 text-sm font-medium text-surface-0 hover:bg-maison-amber/90 transition disabled:opacity-50"
            >
              {isSavingEdit ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </>
        }
      >
        <form id="edit-tenant-form" onSubmit={handleUpdate} noValidate className="space-y-4">
          <Field
            label="Nombre del restaurante"
            value={editForm.name}
            onChange={(v) => setEditForm({ ...editForm, name: v })}
            required
            maxLength={LIMITS.name}
            error={editFieldErrors.name}
          />
          <Field
            label="Correo del restaurante"
            type="email"
            value={editForm.email}
            onChange={(v) => setEditForm({ ...editForm, email: v })}
            required
            maxLength={LIMITS.email}
            error={editFieldErrors.email}
          />
          <Field
            label="Teléfono"
            value={editForm.phone}
            onChange={(v) => setEditForm({ ...editForm, phone: v })}
            maxLength={30}
            error={editFieldErrors.phone}
          />
          <Field
            label="Dirección"
            value={editForm.address}
            onChange={(v) => setEditForm({ ...editForm, address: v })}
            maxLength={255}
            error={editFieldErrors.address}
          />
          {editError && (
            <div className="rounded-lg bg-maison-ruby/10 border border-maison-ruby/30 px-3 py-2">
              <p className="text-xs text-maison-ruby">{editError}</p>
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={confirmState !== null}
        onClose={() => !isConfirmBusy && setConfirmState(null)}
        title={confirmState?.title ?? ''}
        description={confirmState?.description}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirmState(null)}
              disabled={isConfirmBusy}
              className="rounded-lg px-4 py-2 text-sm font-medium text-maison-cream-muted hover:text-maison-cream transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmAccept}
              disabled={isConfirmBusy}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                confirmState?.danger
                  ? 'bg-maison-ruby text-white hover:bg-maison-ruby/90'
                  : 'bg-maison-amber text-surface-0 hover:bg-maison-amber/90'
              }`}
            >
              {isConfirmBusy ? 'Procesando…' : confirmState?.confirmLabel}
            </button>
          </>
        }
      >
        {confirmState?.withReason && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-maison-cream-dim uppercase tracking-wider">Motivo (opcional)</label>
            <textarea
              value={confirmReason}
              onChange={(e) => setConfirmReason(e.target.value)}
              maxLength={255}
              rows={3}
              placeholder="Ej. Pago pendiente, incumplimiento de términos…"
              className="w-full resize-none bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-maison-cream placeholder:text-maison-cream-muted focus:outline-none focus:border-maison-amber/50 focus:ring-1 focus:ring-maison-amber/30 transition"
            />
          </div>
        )}
      </Modal>

      <Modal
        open={alertState !== null}
        onClose={() => setAlertState(null)}
        title={alertState?.title ?? ''}
        size="sm"
        footer={
          <button
            type="button"
            onClick={() => setAlertState(null)}
            className="rounded-lg bg-maison-amber px-4 py-2 text-sm font-medium text-surface-0 hover:bg-maison-amber/90 transition"
          >
            Entendido
          </button>
        }
      >
        <p className="text-sm text-maison-cream-muted">{alertState?.message}</p>
      </Modal>
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
  maxLength,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-maison-cream-dim uppercase tracking-wider">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`w-full bg-surface-2 border rounded-lg px-3 py-2.5 text-sm text-maison-cream placeholder:text-maison-cream-muted focus:outline-none focus:ring-1 transition ${
          error
            ? 'border-maison-ruby/50 focus:border-maison-ruby focus:ring-maison-ruby/30'
            : 'border-white/10 focus:border-maison-amber/50 focus:ring-maison-amber/30'
        }`}
      />
      {maxLength && (
        <p className="text-2xs text-maison-cream-dim text-right">{value.length}/{maxLength}</p>
      )}
      {error && <p className="text-2xs text-maison-ruby">{error}</p>}
    </div>
  );
}
