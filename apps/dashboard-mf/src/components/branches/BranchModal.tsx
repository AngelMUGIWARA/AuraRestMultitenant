import { useEffect, useState } from 'react';
import type { Branch } from '@maison/types';
import { Modal } from '@maison/ui';
import { branchesService } from '../../services/branches.service';

interface BranchModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Si viene, es edición; si no, alta */
  branch?: Branch | null;
}

const FIELD = 'flex flex-col gap-1.5';
const LABEL = 'text-2xs font-semibold uppercase tracking-widest text-maison-cream-dim';

// El backend (CreateBranchDto/UpdateBranchDto) solo acepta estos campos —
// el ValidationPipe global usa forbidNonWhitelisted, así que enviar city,
// email o capacity (que sí existen en el tipo Branch de @maison/types pero
// el modelo Prisma todavía no) haría que la petición completa fallara con 400.
export function BranchModal({ open, onClose, onSuccess, branch }: BranchModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(branch?.name ?? '');
      setAddress(branch?.address ?? '');
      setPhone(branch?.phone ?? '');
      setError(null);
    }
  }, [open, branch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (branch) {
        await branchesService.update(branch.id, { name, address, phone: phone || undefined });
      } else {
        await branchesService.create({ name, address, phone: phone || undefined });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la sucursal');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={branch ? `Editar ${branch.name}` : 'Nueva sucursal'}
      description={branch ? undefined : 'Registra una nueva sede del restaurante.'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className={FIELD}>
          <span className={LABEL}>Nombre</span>
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-base"
            placeholder="Sucursal Sur"
          />
        </label>

        <label className={FIELD}>
          <span className={LABEL}>Dirección</span>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="input-base"
            placeholder="Av. Reforma 123, Col. Centro"
          />
        </label>

        <label className={FIELD}>
          <span className={LABEL}>Teléfono</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-base"
            placeholder="+52 55 0000 0000"
          />
        </label>

        {error && (
          <p role="alert" className="rounded border border-maison-ruby/40 bg-maison-ruby-bg px-3 py-2 text-xs text-maison-ruby">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
            {submitting ? 'Guardando…' : branch ? 'Guardar cambios' : 'Crear sucursal'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
