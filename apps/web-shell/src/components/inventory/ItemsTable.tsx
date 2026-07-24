'use client';

import type { InventoryItem } from '@maison/types';
import { IconPackage, IconPencil } from '@maison/ui';
import { EmptyState } from '@maison/ui';
import { cn } from '@/lib/utils';
import { StockBar } from './StockBar';
import { formatMoney, formatQty, UNIT_LABELS } from './inventory-meta';

interface ItemsTableProps {
  items: InventoryItem[];
  /** OWNER/ADMIN ven costos y proveedor; CHEF/MANAGER-operativo no */
  showCosts: boolean;
  /** Muestra el lápiz de edición (OWNER/ADMIN) */
  onEdit?: (item: InventoryItem) => void;
}

export function ItemsTable({ items, showCosts, onEdit }: ItemsTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<IconPackage className="h-6 w-6" />}
        title="Sin insumos"
        description="Aún no hay insumos registrados en la despensa."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-maison-border text-left">
            <th className="section-label pb-2 pl-0 font-semibold">Insumo</th>
            <th className="section-label pb-2 font-semibold">Existencias</th>
            <th className="section-label pb-2 text-right font-semibold">Stock</th>
            {showCosts && (
              <>
                <th className="section-label pb-2 text-right font-semibold">Costo unit.</th>
                <th className="section-label hidden pb-2 font-semibold md:table-cell">Proveedor</th>
              </>
            )}
            {onEdit && <th className="w-10 pb-2" aria-label="Acciones" />}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const total = item.totalStock ?? item.stocks.reduce((s, e) => s + Number(e.quantity), 0);
            const low = total < Number(item.minStock);
            return (
              <tr
                key={item.id}
                className="group animate-slide-in-up border-b border-maison-border/60 transition-colors hover:bg-surface-2/60"
                style={{ animationDelay: `${Math.min(idx * 30, 300)}ms`, animationFillMode: 'backwards' }}
              >
                <td className="py-3 pl-0 pr-4">
                  <div className="flex flex-col gap-0.5">
                    <span className={cn('font-medium', item.isActive ? 'text-maison-cream' : 'text-maison-cream-dim line-through')}>
                      {item.name}
                    </span>
                    <span className="font-mono text-2xs uppercase tracking-wider text-maison-cream-dim">
                      {item.sku ?? '—'} · {UNIT_LABELS[item.unit]}
                    </span>
                  </div>
                </td>
                <td className="w-40 min-w-32 py-3 pr-4 align-middle">
                  <StockBar quantity={total} minStock={Number(item.minStock)} maxStock={item.maxStock ? Number(item.maxStock) : null} />
                </td>
                <td className="py-3 pr-4 text-right">
                  <span className={cn('font-mono text-sm tabular-nums', low ? 'font-semibold text-maison-ruby' : 'text-maison-cream')}>
                    {formatQty(total, item.unit)}
                  </span>
                  <span className="block font-mono text-2xs tabular-nums text-maison-cream-dim">
                    mín {formatQty(item.minStock)}
                  </span>
                </td>
                {showCosts && (
                  <>
                    <td className="py-3 pr-4 text-right font-mono text-sm tabular-nums text-maison-cream-muted">
                      {formatMoney(item.costPerUnit)}
                    </td>
                    <td className="hidden py-3 pr-4 text-xs text-maison-cream-muted md:table-cell">
                      {item.supplier?.name ?? '—'}
                    </td>
                  </>
                )}
                {onEdit && (
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="rounded p-1.5 text-maison-cream-dim opacity-0 transition-all hover:bg-surface-3 hover:text-maison-amber focus:opacity-100 group-hover:opacity-100"
                      aria-label={`Editar ${item.name}`}
                    >
                      <IconPencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
