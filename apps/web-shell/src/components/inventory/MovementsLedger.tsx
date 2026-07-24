'use client';

import type { InventoryMovement } from '@maison/types';
import { EmptyState, IconActivity } from '@maison/ui';
import { cn } from '@/lib/utils';
import { MovementBadge } from './MovementBadge';
import { formatDateTime, formatMoney, formatQty, MOVEMENT_META } from './inventory-meta';

interface MovementsLedgerProps {
  movements: InventoryMovement[];
  /** OWNER/ADMIN ven la columna de costo */
  showCosts: boolean;
}

/** Kardex: libro de movimientos con cantidades firmadas en monospace */
export function MovementsLedger({ movements, showCosts }: MovementsLedgerProps) {
  if (movements.length === 0) {
    return (
      <EmptyState
        icon={<IconActivity className="h-6 w-6" />}
        title="Sin movimientos"
        description="El kardex está vacío para los filtros seleccionados."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-maison-border text-left">
            <th className="section-label pb-2 pl-0 font-semibold">Fecha</th>
            <th className="section-label pb-2 font-semibold">Tipo</th>
            <th className="section-label pb-2 font-semibold">Insumo</th>
            <th className="section-label pb-2 text-right font-semibold">Cantidad</th>
            {showCosts && <th className="section-label pb-2 text-right font-semibold">Costo</th>}
            <th className="section-label hidden pb-2 font-semibold lg:table-cell">Registró</th>
            <th className="section-label hidden pb-2 font-semibold md:table-cell">Ref.</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((mov, idx) => {
            const meta = MOVEMENT_META[mov.type];
            const outbound = meta.sign === '-';
            return (
              <tr
                key={mov.id}
                className="animate-slide-in-up border-b border-maison-border/60 transition-colors hover:bg-surface-2/60"
                style={{ animationDelay: `${Math.min(idx * 25, 300)}ms`, animationFillMode: 'backwards' }}
              >
                <td className="whitespace-nowrap py-2.5 pl-0 pr-4 font-mono text-xs tabular-nums text-maison-cream-dim">
                  {formatDateTime(mov.createdAt)}
                </td>
                <td className="py-2.5 pr-4">
                  <MovementBadge type={mov.type} />
                </td>
                <td className="py-2.5 pr-4 text-maison-cream">{mov.item?.name ?? mov.itemId}</td>
                <td className="py-2.5 pr-4 text-right">
                  <span
                    className={cn(
                      'font-mono text-sm font-medium tabular-nums',
                      outbound ? 'text-maison-ruby' : 'text-maison-sage',
                    )}
                  >
                    {outbound ? '−' : '+'}
                    {formatQty(mov.quantity, mov.item?.unit)}
                  </span>
                </td>
                {showCosts && (
                  <td className="py-2.5 pr-4 text-right font-mono text-xs tabular-nums text-maison-cream-muted">
                    {formatMoney(mov.totalCost)}
                  </td>
                )}
                <td className="hidden py-2.5 pr-4 text-xs text-maison-cream-muted lg:table-cell">
                  {mov.user ? (
                    <span>
                      {mov.user.name}
                      <span className="ml-1.5 font-mono text-2xs uppercase tracking-wider text-maison-cream-dim">
                        {mov.user.role}
                      </span>
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="hidden max-w-36 truncate py-2.5 font-mono text-2xs text-maison-cream-dim md:table-cell">
                  {mov.reference ?? mov.reason ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
