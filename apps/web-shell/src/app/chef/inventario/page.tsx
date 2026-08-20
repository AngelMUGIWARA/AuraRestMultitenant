'use client';

import { useMemo, useState } from 'react';
import { AuthClient } from '@maison/auth-client';
import { useBranch } from '@maison/ui';
import { IconAlertTriangle, IconPackage, Skeleton } from '@maison/ui';
import { cn } from '@/lib/utils';
import type { InventoryMovementType, MenuAvailability } from '@maison/types';
import {
  useInventoryItems,
  useInventoryStock,
  useMenuAvailability,
} from '@/hooks/useInventory';
import { inventoryService } from '@/services/inventory.service';
import { formatQty } from '@/components/inventory/inventory-meta';
import { StockBar } from '@/components/inventory/StockBar';
import { AvailabilityBoard } from '@/components/inventory/AvailabilityBoard';
import { RecipesPanel } from '@/components/inventory/RecipesPanel';
import { MovementModal } from '@/components/inventory/MovementModal';

type TabId = 'existencias' | 'disponibilidad' | 'recetas';

export default function ChefInventarioPage() {
  const role = AuthClient.getRole() ?? '';
  const { selectedBranch } = useBranch();
  const branchId = selectedBranch.id;

  const isChef = role === 'KITCHEN_STAFF';

  const tabs = useMemo<TabId[]>(
    () => (isChef ? ['existencias', 'disponibilidad', 'recetas'] : ['existencias', 'disponibilidad']),
    [isChef],
  );
  const [tab, setTab] = useState<TabId>('existencias');

  const items = useInventoryItems(undefined, branchId);
  const stock = useInventoryStock(branchId);
  const availability = useMenuAvailability(branchId);

  const [movementOpen, setMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<InventoryMovementType>('CONSUMPTION');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleToggleAvailable(item: MenuAvailability) {
    setTogglingId(item.menuItemId);
    try {
      await inventoryService.updateMenuItemStatus(
        item.menuItemId,
        item.available ? 'OUT_OF_STOCK' : 'AVAILABLE',
      );
      availability.refresh();
    } catch {
      // El error se ignora en la UI; el estado simplemente no cambia y el usuario puede reintentar.
    } finally {
      setTogglingId(null);
    }
  }

  const branchOptions = useMemo(() => {
    const map = new Map<string, string>();
    (stock.data ?? []).forEach((s) => map.set(s.branch.id, s.branch.name));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [stock.data]);

  const lowCount = (stock.data ?? []).filter((s) => s.belowMinimum).length;

  const openMovement = (type: InventoryMovementType) => {
    setMovementType(type);
    setMovementOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Encabezado ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-2xs uppercase tracking-[0.2em] text-maison-cream-dim">
            Estación de cocina · {selectedBranch.isGlobal ? 'Mi sucursal' : selectedBranch.name}
          </p>
          <h1 className="mt-1 font-display text-2xl font-medium text-maison-cream">
            Despensa
            <span className="ml-2 font-display italic text-maison-amber">servicio</span>
          </h1>
        </div>

        {isChef && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openMovement('CONSUMPTION')} className="btn-primary">
              Registrar consumo
            </button>
            <button
              type="button"
              onClick={() => openMovement('WASTE')}
              className="btn-ghost hover:border-maison-ruby/40 hover:text-maison-ruby"
            >
              Registrar merma
            </button>
          </div>
        )}
      </div>

      {/* Aviso de insumos bajos — accionable de un vistazo en cocina */}
      {lowCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-maison-gold/30 bg-maison-gold-bg px-4 py-3 animate-fade-in">
          <IconAlertTriangle className="h-4 w-4 flex-shrink-0 text-maison-gold" />
          <p className="text-sm text-maison-cream">
            <span className="font-semibold text-maison-gold">{lowCount} insumo{lowCount === 1 ? '' : 's'}</span>{' '}
            por debajo del mínimo — avisa a tu gerente antes del siguiente servicio.
          </p>
        </div>
      )}

      {/* ── Tabs ── */}
      <div role="tablist" aria-label="Secciones" className="flex gap-1 overflow-x-auto border-b border-maison-border">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'relative whitespace-nowrap px-3.5 pb-2.5 pt-1 text-xs font-semibold uppercase tracking-widest transition-colors',
              tab === t ? 'text-maison-amber' : 'text-maison-cream-dim hover:text-maison-cream',
            )}
          >
            {t === 'existencias' ? 'Existencias' : t === 'disponibilidad' ? 'Disponibilidad' : 'Recetas'}
            {tab === t && (
              <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-t bg-maison-amber" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>

      {/* ── Contenido ── */}
      <section className="animate-fade-in" role="tabpanel">
        {tab === 'existencias' && (
          stock.isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : stock.error ? (
            <p role="alert" className="rounded border border-maison-ruby/40 bg-maison-ruby-bg px-4 py-3 text-sm text-maison-ruby">
              {stock.error.message}
            </p>
          ) : (stock.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <IconPackage className="h-8 w-8 text-maison-cream-dim" />
              <p className="text-sm text-maison-cream-dim">Sin existencias registradas en tu sucursal.</p>
            </div>
          ) : (
            // Fichas de estación: cantidad grande y legible a distancia de cocina
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(stock.data ?? []).map((s, idx) => (
                <article
                  key={s.id}
                  className={cn(
                    'card animate-slide-in-up flex flex-col gap-3 p-4',
                    s.belowMinimum && 'border-l-2 border-l-maison-ruby',
                  )}
                  style={{ animationDelay: `${Math.min(idx * 30, 350)}ms`, animationFillMode: 'backwards' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-maison-cream">{s.item.name}</p>
                      <p className="font-mono text-2xs uppercase tracking-wider text-maison-cream-dim">
                        {s.item.sku ?? s.branch.name}
                      </p>
                    </div>
                    {s.belowMinimum && (
                      <span className="badge bg-maison-ruby-bg text-maison-ruby animate-pulse-soft">Bajo</span>
                    )}
                  </div>

                  <p
                    className={cn(
                      'font-mono text-2xl font-medium tabular-nums',
                      s.belowMinimum ? 'text-maison-ruby' : 'text-maison-cream',
                    )}
                  >
                    {formatQty(s.quantity, s.item.unit)}
                  </p>

                  <StockBar
                    quantity={Number(s.quantity)}
                    minStock={Number(s.item.minStock)}
                    maxStock={s.item.maxStock ? Number(s.item.maxStock) : null}
                  />
                </article>
              ))}
            </div>
          )
        )}

        {tab === 'disponibilidad' && (
          availability.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <AvailabilityBoard
              items={availability.data ?? []}
              onToggleAvailable={isChef ? handleToggleAvailable : undefined}
              togglingId={togglingId}
            />
          )
        )}

        {tab === 'recetas' && isChef && (
          <RecipesPanel
            menuItems={availability.data ?? []}
            canEdit={false}
          />
        )}
      </section>

      {/* Modal de consumo/merma — solo KITCHEN_STAFF */}
      {isChef && (
        <MovementModal
          open={movementOpen}
          onClose={() => setMovementOpen(false)}
          onSuccess={() => { stock.refresh(); availability.refresh(); }}
          role={role}
          items={(items.data ?? []).filter((i) => i.isActive).map((i) => ({ id: i.id, name: i.name, unit: i.unit }))}
          branches={branchOptions}
          showCosts={false}
          initialType={movementType}
        />
      )}
    </div>
  );
}
