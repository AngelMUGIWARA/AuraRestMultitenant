'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CreateMovementPayload, InventoryMovementType, Supplier } from '@maison/types';
import { Modal } from '@maison/ui';
import { cn } from '@/lib/utils';
import { inventoryService } from '@/services/inventory.service';
import { MOVEMENT_META, MOVEMENT_TYPES_BY_ROLE, UNIT_LABELS } from './inventory-meta';

interface ItemOption {
  id: string;
  name: string;
  unit: string;
}

interface BranchOption {
  id: string;
  name: string;
}

interface MovementModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  role: string;
  items: ItemOption[];
  branches: BranchOption[];
  suppliers?: Supplier[];
  /** OWNER/ADMIN/MANAGER pueden capturar costo en compras */
  showCosts: boolean;
  /** Preselección (p. ej. desde una alerta) */
  initialItemId?: string;
  initialType?: InventoryMovementType;
}

const FIELD = 'flex flex-col gap-1.5';
const LABEL = 'text-2xs font-semibold uppercase tracking-widest text-maison-cream-dim';

export function MovementModal({
  open,
  onClose,
  onSuccess,
  role,
  items,
  branches,
  suppliers = [],
  showCosts,
  initialItemId,
  initialType,
}: MovementModalProps) {
  const allowedTypes = useMemo(() => MOVEMENT_TYPES_BY_ROLE[role] ?? [], [role]);

  const [type, setType] = useState<InventoryMovementType>(allowedTypes[0] ?? 'CONSUMPTION');
  const [itemId, setItemId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [unitCost, setUnitCost] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType(initialType && allowedTypes.includes(initialType) ? initialType : (allowedTypes[0] ?? 'CONSUMPTION'));
      setItemId(initialItemId ?? '');
      setBranchId(branches.length === 1 ? branches[0].id : '');
      setQuantity('');
      setDirection('IN');
      setUnitCost('');
      setSupplierId('');
      setReason('');
      setReference('');
      setError(null);
    }
  }, [open, initialItemId, initialType, allowedTypes, branches]);

  const selectedItem = items.find((i) => i.id === itemId);
  const isPurchase = type === 'PURCHASE';
  const isAdjustment = type === 'ADJUSTMENT';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemId || !branchId || !quantity) return;
    setSubmitting(true);
    setError(null);

    const payload: CreateMovementPayload = {
      itemId,
      branchId,
      type,
      quantity: Number(quantity),
      ...(isAdjustment ? { direction } : {}),
      ...(isPurchase && showCosts && unitCost ? { unitCost: Number(unitCost) } : {}),
      ...(isPurchase && supplierId ? { supplierId } : {}),
      ...(reason ? { reason } : {}),
      ...(reference ? { reference } : {}),
    };

    try {
      await inventoryService.createMovement(payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el movimiento');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar movimiento"
      description="El stock se actualiza de inmediato al confirmar."
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Tipo — chips seleccionables limitados al rol */}
        <div className={FIELD}>
          <span className={LABEL}>Tipo de movimiento</span>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de movimiento">
            {allowedTypes.map((t) => {
              const meta = MOVEMENT_META[t];
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setType(t)}
                  className={cn(
                    'badge border transition-all',
                    active
                      ? cn(meta.chipClass, 'border-current')
                      : 'border-maison-border bg-surface-2 text-maison-cream-dim hover:text-maison-cream',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', active ? meta.dotClass : 'bg-maison-cream-dim')} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={FIELD}>
            <span className={LABEL}>Insumo</span>
            <select
              required
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="input-base"
            >
              <option value="">Seleccionar…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </label>

          <label className={FIELD}>
            <span className={LABEL}>Sucursal</span>
            <select
              required
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="input-base"
            >
              <option value="">Seleccionar…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>

          <label className={FIELD}>
            <span className={LABEL}>
              Cantidad{selectedItem ? ` (${UNIT_LABELS[selectedItem.unit as keyof typeof UNIT_LABELS] ?? selectedItem.unit})` : ''}
            </span>
            <input
              required
              type="number"
              min="0.001"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input-base font-mono tabular-nums"
              placeholder="0.000"
            />
          </label>

          {isAdjustment && (
            <div className={FIELD}>
              <span className={LABEL}>Dirección del ajuste</span>
              <div className="flex gap-1.5">
                {(['IN', 'OUT'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    className={cn(
                      'flex-1 rounded border px-3 py-1.5 font-mono text-sm transition-all',
                      direction === d
                        ? d === 'IN'
                          ? 'border-maison-sage bg-maison-sage-bg text-maison-sage'
                          : 'border-maison-ruby bg-maison-ruby-bg text-maison-ruby'
                        : 'border-maison-border bg-surface-2 text-maison-cream-dim',
                    )}
                  >
                    {d === 'IN' ? '+ Entrada' : '− Salida'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isPurchase && showCosts && (
            <label className={FIELD}>
              <span className={LABEL}>Costo unitario (MXN)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="input-base font-mono tabular-nums"
                placeholder="0.00"
              />
            </label>
          )}

          {isPurchase && suppliers.length > 0 && (
            <label className={FIELD}>
              <span className={LABEL}>Proveedor</span>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="input-base"
              >
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <label className={FIELD}>
          <span className={LABEL}>Motivo</span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input-base"
            placeholder={type === 'WASTE' ? 'Producto en mal estado…' : 'Opcional'}
          />
        </label>

        <label className={FIELD}>
          <span className={LABEL}>Referencia (folio / factura)</span>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="input-base font-mono"
            placeholder="ORD-0001, FAC-2026-014…"
          />
        </label>

        {error && (
          <p role="alert" className="rounded border border-maison-ruby/40 bg-maison-ruby-bg px-3 py-2 text-xs text-maison-ruby">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
            {submitting ? 'Registrando…' : 'Registrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
