import { useEffect, useState, useRef } from 'react';
import type { Branch } from '@maison/types';
import { Modal } from '@maison/ui';
import { branchesService } from '../../services/branches.service';
import { TablesSection, type TablesSectionRef } from './TablesSection';
import { tablesService } from '../../services/tables.service';

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
  const tablesSectionRef = useRef<TablesSectionRef>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [tableCount, setTableCount] = useState<number>(0);
  const [defaultCapacity, setDefaultCapacity] = useState<number>(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solo mostrar campos de mesas si es nueva sucursal
  const isNew = !branch;

  useEffect(() => {
    if (open) {
      setName(branch?.name ?? '');
      setAddress(branch?.address ?? '');
      setPhone(branch?.phone ?? '');
      if (isNew) {
        setTableCount(0);
        setDefaultCapacity(4);
      }
      setError(null);
    }
  }, [open, branch, isNew]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (branch) {
        // Modo edición: guardar branch + mesas pendientes
        console.info('[BRANCH SAVE] Mode: edit, branchId:', branch.id);

        // Paso 1: Actualizar sucursal
        console.info('[BRANCH SAVE] Updating branch:', { name, address, phone });
        await branchesService.update(branch.id, {
          name,
          address,
          phone: phone || undefined
        });
        console.info('[BRANCH SAVE] Branch updated successfully');

        // Paso 2: Aplicar cambios de mesas pendientes
        const pendingChanges = tablesSectionRef.current?.getPendingChanges();
        if (pendingChanges) {
          // Crear nuevas mesas
          if (pendingChanges.newTables) {
            const { quantity, capacity } = pendingChanges.newTables;
            const response = await tablesSectionRef.current.refetchTables();

            // Refetch tables first to get current max number
            const maxNumber = await (async () => {
              const res = await tablesService.getByBranch(branch.id);
              return res.data && res.data.length > 0
                ? Math.max(...res.data.map(t => t.number))
                : 0;
            })();

            console.info('[BRANCH SAVE] Creating tables:', { quantity, capacity, startNumber: maxNumber + 1 });

            for (let i = 0; i < quantity; i++) {
              const number = maxNumber + i + 1;
              console.info('[BRANCH SAVE] Create payload:', { number, capacity, branchId: branch.id });
              await tablesService.create(branch.id, { number, capacity });
              console.info('[BRANCH SAVE] Table created:', number);
            }
          }

          // Actualizar mesas existentes
          if (pendingChanges.tableUpdates.length > 0) {
            console.info('[BRANCH SAVE] Updating tables:', pendingChanges.tableUpdates);
            for (const { tableId, capacity } of pendingChanges.tableUpdates) {
              await tablesService.update(branch.id, tableId, { capacity });
              console.info('[BRANCH SAVE] Table updated:', tableId);
            }
          }

          // Desactivar mesas
          if (pendingChanges.tableRemovals.length > 0) {
            console.info('[BRANCH SAVE] Removing tables:', pendingChanges.tableRemovals);
            for (const tableId of pendingChanges.tableRemovals) {
              await tablesService.delete(branch.id, tableId);
              console.info('[BRANCH SAVE] Table removed:', tableId);
            }
          }

          // Limpiar cambios pendientes después de guardar
          tablesSectionRef.current?.clearPendingChanges();
        }

        console.info('[BRANCH SAVE] Refetching tables after all operations');
        await tablesSectionRef.current?.refetchTables();
      } else {
        // Modo creación: guardar branch con mesas iniciales
        console.info('[BRANCH SAVE] Mode: create');
        await branchesService.create({
          name,
          address,
          phone: phone || undefined,
          tableCount,
          defaultCapacity: tableCount > 0 ? defaultCapacity : undefined,
        });
        console.info('[BRANCH SAVE] Branch created successfully');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('[BRANCH SAVE] Error:', err);
      const message = err instanceof Error ? err.message : 'No se pudo guardar la sucursal';
      setError(message);
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

        {isNew && (
          <>
            <div className="border-t border-maison-border pt-4 mt-4">
              <span className={LABEL}>Configuración de mesas</span>
            </div>

            <label className={FIELD}>
              <span className={LABEL}>Cantidad de mesas</span>
              <input
                type="number"
                min="0"
                value={tableCount}
                onChange={(e) => setTableCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="input-base"
                placeholder="0"
              />
              <p className="text-2xs text-maison-cream-dim mt-1">Deixa en 0 para crear la sucursal sin mesas y configurarlas después</p>
            </label>

            {tableCount > 0 && (
              <label className={FIELD}>
                <span className={LABEL}>Capacidad inicial por mesa</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={defaultCapacity}
                    onChange={(e) => setDefaultCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="input-base flex-1"
                    placeholder="4"
                  />
                  <span className="text-sm text-maison-cream-muted">personas</span>
                </div>
              </label>
            )}
          </>
        )}

        {!isNew && branch && (
          <TablesSection ref={tablesSectionRef} branchId={branch.id} isEditing={true} />
        )}

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
