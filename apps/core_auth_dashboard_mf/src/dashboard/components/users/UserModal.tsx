import { useEffect, useState } from 'react';
import { Modal } from '@maison/ui';
import type { UserRole } from '@maison/types';
import { usersService } from '../../services/users.service';
import { branchesService } from '../../services/branches.service';

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingUser?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
    branchId?: string;
  } | null;
}

const FIELD = 'flex flex-col gap-1.5';
const LABEL = 'text-2xs font-semibold uppercase tracking-widest text-maison-cream-dim';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'MANAGER', label: 'Gerente' },
  { value: 'WAITER', label: 'Mesero' },
  { value: 'CASHIER', label: 'Cajero' },
  { value: 'KITCHEN_STAFF', label: 'Cocina' },
];

export function UserModal({ open, onClose, onSuccess, editingUser }: UserModalProps) {
  const isEditing = !!editingUser;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('WAITER');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showBranch = role !== 'OWNER';

  useEffect(() => {
    if (open) {
      if (isEditing && editingUser) {
        setName(editingUser.name);
        setEmail(editingUser.email);
        setPassword('');
        setRole(editingUser.role);
        setPhone(editingUser.phone || '');
        setBranchId(editingUser.branchId || '');
      } else {
        setName('');
        setEmail('');
        setPassword('');
        setRole('WAITER');
        setPhone('');
        setBranchId('');
      }
      setError(null);

      branchesService.getAll({ status: 'active' }).then((res) => {
        const items = res.data?.data ?? [];
        setBranches(items.map((b) => ({ id: b.id, name: b.name })));
      }).catch(() => setBranches([]));
    }
  }, [open, isEditing, editingUser]);

  useEffect(() => {
    if (!showBranch) setBranchId('');
  }, [showBranch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isEditing && editingUser) {
        await usersService.update(editingUser.id, {
          name,
          role,
          phone: phone || undefined,
          branchId: showBranch && branchId ? branchId : undefined,
        });
      } else {
        await usersService.create({
          name,
          email,
          password,
          role,
          phone: phone || undefined,
          branchId: showBranch && branchId ? branchId : undefined,
        });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `No se pudo ${isEditing ? 'actualizar' : 'crear'} el usuario`;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar usuario" : "Nuevo usuario"}
      description={isEditing ? "Actualiza los datos del usuario." : "Crea una cuenta de acceso para tu equipo."}
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
            placeholder="Juan Pérez"
          />
        </label>

        <label className={FIELD}>
          <span className={LABEL}>Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={isEditing}
            className="input-base"
            placeholder="juan@restaurante.com"
          />
        </label>

        {!isEditing && (
          <label className={FIELD}>
            <span className={LABEL}>Contraseña</span>
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base"
              placeholder="Mínimo 6 caracteres"
            />
          </label>
        )}

        <label className={FIELD}>
          <span className={LABEL}>Rol</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="input-base"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        <label className={FIELD}>
          <span className={LABEL}>Teléfono (opcional)</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-base"
            placeholder="+52 55 1234 5678"
          />
        </label>

        {showBranch && (
          <label className={FIELD}>
            <span className={LABEL}>Sucursal</span>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="input-base"
              required={showBranch}
            >
              <option value="">Seleccionar sucursal</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {branches.length === 0 && (
              <p className="text-2xs text-maison-cream-dim mt-1">No hay sucursales disponibles. Crea una sucursal primero.</p>
            )}
          </label>
        )}

        {error && (
          <p role="alert" className="rounded border border-maison-ruby/40 bg-maison-ruby-bg px-3 py-2 text-xs text-maison-ruby">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
            {submitting ? (isEditing ? 'Actualizando…' : 'Creando…') : (isEditing ? 'Guardar cambios' : 'Crear usuario')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
