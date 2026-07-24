'use client';

import { useEffect, useState } from 'react';
import type { CreateSupplierPayload, Supplier } from '@maison/types';
import { EmptyState, IconMail, IconPencil, IconPhone, IconPlus, IconUsers, Modal } from '@maison/ui';
import { cn } from '@/lib/utils';
import { inventoryService } from '@/services/inventory.service';

const FIELD = 'flex flex-col gap-1.5';
const LABEL = 'text-2xs font-semibold uppercase tracking-widest text-maison-cream-dim';

interface SuppliersPanelProps {
  suppliers: Supplier[];
  onChanged: () => void;
}

/** Directorio de proveedores — exclusivo OWNER/ADMIN */
export function SuppliersPanel({ suppliers, onChanged }: SuppliersPanelProps) {
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-maison-cream-dim">
          {suppliers.length} proveedor{suppliers.length === 1 ? '' : 'es'} registrados
        </p>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary">
          <IconPlus className="h-3.5 w-3.5" />
          Nuevo proveedor
        </button>
      </div>

      {suppliers.length === 0 ? (
        <EmptyState
          icon={<IconUsers className="h-6 w-6" />}
          title="Sin proveedores"
          description="Registra a quién le compras los insumos de la despensa."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((s, idx) => (
            <article
              key={s.id}
              className="card card-hover group animate-slide-in-up flex flex-col gap-3 p-4"
              style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'backwards' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={cn('truncate font-medium', s.isActive ? 'text-maison-cream' : 'text-maison-cream-dim line-through')}>
                    {s.name}
                  </p>
                  {s.contactName && (
                    <p className="mt-0.5 truncate text-xs text-maison-cream-muted">{s.contactName}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  className="rounded p-1.5 text-maison-cream-dim opacity-0 transition-all hover:bg-surface-3 hover:text-maison-amber focus:opacity-100 group-hover:opacity-100"
                  aria-label={`Editar ${s.name}`}
                >
                  <IconPencil className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex flex-col gap-1 text-xs text-maison-cream-dim">
                {s.phone && (
                  <span className="flex items-center gap-1.5">
                    <IconPhone className="h-3 w-3" /> {s.phone}
                  </span>
                )}
                {s.email && (
                  <span className="flex items-center gap-1.5 truncate">
                    <IconMail className="h-3 w-3" /> {s.email}
                  </span>
                )}
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-maison-border/60 pt-2.5">
                <span className="font-mono text-2xs uppercase tracking-wider text-maison-cream-dim">
                  {s.itemCount ?? 0} insumos
                </span>
                <span className={s.isActive ? 'badge-active' : 'badge-inactive'}>
                  {s.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <SupplierModal
        open={creating || editing !== null}
        supplier={editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSuccess={onChanged}
      />
    </div>
  );
}

function SupplierModal({
  open,
  supplier,
  onClose,
  onSuccess,
}: {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(supplier?.name ?? '');
      setContactName(supplier?.contactName ?? '');
      setEmail(supplier?.email ?? '');
      setPhone(supplier?.phone ?? '');
      setAddress(supplier?.address ?? '');
      setIsActive(supplier?.isActive ?? true);
      setError(null);
    }
  }, [open, supplier]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: CreateSupplierPayload = {
      name,
      ...(contactName ? { contactName } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(address ? { address } : {}),
      isActive,
    };

    try {
      if (supplier) {
        await inventoryService.updateSupplier(supplier.id, payload);
      } else {
        await inventoryService.createSupplier(payload);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el proveedor');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={supplier ? `Editar ${supplier.name}` : 'Nuevo proveedor'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={`${FIELD} sm:col-span-2`}>
            <span className={LABEL}>Nombre</span>
            <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-base" />
          </label>
          <label className={FIELD}>
            <span className={LABEL}>Contacto</span>
            <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className="input-base" />
          </label>
          <label className={FIELD}>
            <span className={LABEL}>Teléfono</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-base font-mono" />
          </label>
          <label className={`${FIELD} sm:col-span-2`}>
            <span className={LABEL}>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-base" />
          </label>
          <label className={`${FIELD} sm:col-span-2`}>
            <span className={LABEL}>Dirección</span>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="input-base" />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-maison-cream-muted">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-[rgb(var(--color-accent))]"
          />
          Proveedor activo
        </label>

        {error && (
          <p role="alert" className="rounded border border-maison-ruby/40 bg-maison-ruby-bg px-3 py-2 text-xs text-maison-ruby">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
            {submitting ? 'Guardando…' : supplier ? 'Guardar cambios' : 'Crear proveedor'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
