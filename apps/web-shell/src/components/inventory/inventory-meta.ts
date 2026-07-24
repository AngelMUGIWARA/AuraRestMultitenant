import type { InventoryMovementType, InventoryUnit } from '@maison/types';

/** Etiquetas cortas de unidad para chips y cantidades */
export const UNIT_LABELS: Record<InventoryUnit, string> = {
  KG: 'kg',
  G: 'g',
  L: 'L',
  ML: 'ml',
  PIECE: 'pza',
  PACKAGE: 'paq',
  BOX: 'caja',
};

export interface MovementMeta {
  label: string;
  /** '+' entrada · '−' salida · '±' depende de direction */
  sign: '+' | '-' | '±';
  chipClass: string;
  dotClass: string;
}

export const MOVEMENT_META: Record<InventoryMovementType, MovementMeta> = {
  PURCHASE: {
    label: 'Compra',
    sign: '+',
    chipClass: 'bg-maison-sage-bg text-maison-sage',
    dotClass: 'bg-maison-sage',
  },
  CONSUMPTION: {
    label: 'Consumo',
    sign: '-',
    chipClass: 'bg-maison-amber-glow text-maison-amber',
    dotClass: 'bg-maison-amber',
  },
  WASTE: {
    label: 'Merma',
    sign: '-',
    chipClass: 'bg-maison-ruby-bg text-maison-ruby',
    dotClass: 'bg-maison-ruby',
  },
  ADJUSTMENT: {
    label: 'Ajuste',
    sign: '±',
    chipClass: 'bg-maison-gold-bg text-maison-gold',
    dotClass: 'bg-maison-gold',
  },
  TRANSFER_IN: {
    label: 'Traslado entrada',
    sign: '+',
    chipClass: 'bg-maison-sage-bg text-maison-sage',
    dotClass: 'bg-maison-sage',
  },
  TRANSFER_OUT: {
    label: 'Traslado salida',
    sign: '-',
    chipClass: 'bg-surface-3 text-maison-cream-muted',
    dotClass: 'bg-maison-cream-dim',
  },
};

/** Tipos de movimiento que cada rol puede registrar (espejo del backend) */
export const MOVEMENT_TYPES_BY_ROLE: Record<string, InventoryMovementType[]> = {
  OWNER: ['PURCHASE', 'CONSUMPTION', 'ADJUSTMENT', 'WASTE', 'TRANSFER_IN', 'TRANSFER_OUT'],
  ADMIN: ['PURCHASE', 'CONSUMPTION', 'ADJUSTMENT', 'WASTE', 'TRANSFER_IN', 'TRANSFER_OUT'],
  MANAGER: ['PURCHASE', 'ADJUSTMENT', 'WASTE'],
  CHEF: ['CONSUMPTION', 'WASTE'],
};

export function formatQty(value: string | number, unit?: InventoryUnit): string {
  const n = Number(value);
  const compact = Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, '');
  return unit ? `${compact} ${UNIT_LABELS[unit]}` : compact;
}

export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
