'use client';

import { useEffect, useState } from 'react';
import type { CreateInventoryItemPayload, InventoryItem, InventoryUnit, Supplier } from '@maison/types';
import { Modal } from '@maison/ui';
import { inventoryService } from '@/services/inventory.service';
import { UNIT_LABELS } from './inventory-meta';

interface ItemModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  suppliers: Supplier[];
  /** Si viene, es edición; si no, alta */
  item?: InventoryItem | null;
}

const FIELD = 'flex flex-col gap-1.5';
const LABEL = 'text-2xs font-semibold uppercase tracking-widest text-maison-cream-dim';

export function ItemModal({ open, onClose, onSuccess, suppliers, item }: ItemModalProps) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState<InventoryUnit>('KG');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(item?.name ?? '');
      setSku(item?.sku ?? '');
      setUnit(item?.unit ?? 'KG');
      setCostPerUnit(item?.costPerUnit !== undefined ? String(item.costPerUnit) : '');
      setMinStock(item ? String(item.minStock) : '');
      setMaxStock(item?.maxStock ? String(item.maxStock) : '');
      setSupplierId(item?.supplierId ?? '');
      setIsActive(item?.isActive ?? true);
      setError(null);
    }
  }, [open, item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: CreateInventoryItemPayload = {
      name,
      unit,
      ...(sku ? { sku } : {}),
      ...(costPerUnit ? { costPerUnit: Number(costPerUnit) } : {}),
      ...(minStock ? { minStock: Number(minStock) } : {}),
      ...(maxStock ? { maxStock: Number(maxStock) } : {}),
      ...(supplierId ? { supplierId } : {}),
      isActive,
    };

    try {
      if (item) {
        await inventoryService.updateItem(item.id, payload);
      } else {
        await inventoryService.createItem(payload);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el insumo');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? `Editar ${item.name}` : 'Nuevo insumo'}
      description={item ? undefined : 'Alta de ingrediente en la despensa del restaurante.'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={`${FIELD} sm:col-span-2`}>
            <span className={LABEL}>Nombre</span>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-base"
              placeholder="Aguacate Hass"
            />
          </label>

          <label className={FIELD}>
            <span className={LABEL}>SKU</span>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="input-base font-mono uppercase"
              placeholder="ABA-010"
            />
          </label>

          <label className={FIELD}>
            <span className={LABEL}>Unidad</span>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as InventoryUnit)}
              className="input-base"
            >
              {(Object.keys(UNIT_LABELS) as InventoryUnit[]).map((u) => (
                <option key={u} value={u}>{UNIT_LABELS[u]} — {u}</option>
              ))}
            </select>
          </label>

          <label className={FIELD}>
            <span className={LABEL}>Costo unitario (MXN)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              className="input-base font-mono tabular-nums"
              placeholder="0.00"
            />
          </label>

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

          <label className={FIELD}>
            <span className={LABEL}>Stock mínimo</span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              className="input-base font-mono tabular-nums"
              placeholder="0"
            />
          </label>

          <label className={FIELD}>
            <span className={LABEL}>Stock máximo</span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={maxStock}
              onChange={(e) => setMaxStock(e.target.value)}
              className="input-base font-mono tabular-nums"
              placeholder="Opcional"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-maison-cream-muted">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-[rgb(var(--color-accent))]"
          />
          Insumo activo
        </label>

        {error && (
          <p role="alert" className="rounded border border-maison-ruby/40 bg-maison-ruby-bg px-3 py-2 text-xs text-maison-ruby">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
            {submitting ? 'Guardando…' : item ? 'Guardar cambios' : 'Crear insumo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
