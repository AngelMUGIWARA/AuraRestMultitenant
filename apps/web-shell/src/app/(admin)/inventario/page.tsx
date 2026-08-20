'use client';

import { useMemo, useState } from 'react';
import { AuthClient } from '@maison/auth-client';
import { useBranch } from '@maison/ui';
import {
  ConfirmDialog,
  IconAlertTriangle,
  IconPackage,
  IconActivity,
  IconDollarSign,
  IconPlus,
  StatCard,
  StatCardSkeleton,
  Skeleton,
} from '@maison/ui';
import { cn } from '@/lib/utils';
import type { InventoryItem, InventoryMovementType } from '@maison/types';
import {
  useInventoryItems,
  useInventoryMovements,
  useInventoryStock,
  useMenuAvailability,
  useStockAlerts,
  useSuppliers,
} from '@/hooks/useInventory';
import { inventoryService } from '@/services/inventory.service';
import { formatMoney, MOVEMENT_TYPES_BY_ROLE } from '@/components/inventory/inventory-meta';
import { ItemsTable } from '@/components/inventory/ItemsTable';
import { MovementsLedger } from '@/components/inventory/MovementsLedger';
import { AlertsPanel } from '@/components/inventory/AlertsPanel';
import { AvailabilityBoard } from '@/components/inventory/AvailabilityBoard';
import { SuppliersPanel } from '@/components/inventory/SuppliersPanel';
import { RecipesPanel } from '@/components/inventory/RecipesPanel';
import { MovementModal } from '@/components/inventory/MovementModal';
import { ItemModal } from '@/components/inventory/ItemModal';

type TabId = 'despensa' | 'kardex' | 'alertas' | 'recetas' | 'proveedores' | 'disponibilidad';

const TAB_LABELS: Record<TabId, string> = {
  despensa: 'Despensa',
  kardex: 'Kardex',
  alertas: 'Alertas',
  recetas: 'Recetas',
  proveedores: 'Proveedores',
  disponibilidad: 'Disponibilidad',
};

export default function InventarioPage() {
  const role = AuthClient.getRole() ?? '';
  const { selectedBranch } = useBranch();
  const branchId = selectedBranch.id;

  const isAdmin = role === 'OWNER' || role === 'MANAGER';
  const isOwner = role === 'OWNER';
  const canMove = (MOVEMENT_TYPES_BY_ROLE[role] ?? []).length > 0;

  const tabs = useMemo<TabId[]>(
    () =>
      isOwner
        ? ['despensa', 'kardex', 'alertas', 'recetas', 'proveedores', 'disponibilidad']
        : ['despensa', 'kardex', 'alertas', 'recetas', 'disponibilidad'],
    [isOwner],
  );
  const [tab, setTab] = useState<TabId>('despensa');

  // Datos
  const items = useInventoryItems(undefined, branchId);
  const stock = useInventoryStock(branchId);
  const alerts = useStockAlerts(branchId);
  const movements = useInventoryMovements({ branchId });
  const availability = useMenuAvailability(branchId);
  const suppliers = useSuppliers(isOwner);

  // Modales
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementPreset, setMovementPreset] = useState<{ itemId?: string; type?: InventoryMovementType }>({});
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  async function handleConfirmDeleteItem() {
    if (!deletingItem) return;
    setIsDeletingItem(true);
    try {
      await inventoryService.removeItem(deletingItem.id);
      items.refresh();
      stock.refresh();
      alerts.refresh();
      setDeletingItem(null);
    } catch {
      // El error se descarta; el diálogo permanece abierto para reintentar o cancelar.
    } finally {
      setIsDeletingItem(false);
    }
  }

  // Sucursales visibles derivadas del stock (ya vienen filtradas por el backend según el rol)
  const branchOptions = useMemo(() => {
    const map = new Map<string, string>();
    (stock.data ?? []).forEach((s) => map.set(s.branch.id, s.branch.name));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [stock.data]);

  // Métricas del encabezado
  const activeItems = (items.data ?? []).filter((i) => i.isActive);
  const alertCount = alerts.data?.length ?? 0;
  const todayMovements = (movements.data ?? []).filter(
    (m) => new Date(m.createdAt).toDateString() === new Date().toDateString(),
  ).length;
  const pantryValue = isAdmin
    ? (stock.data ?? []).reduce(
        (sum, s) => sum + Number(s.quantity) * Number(s.item.costPerUnit ?? 0),
        0,
      )
    : null;

  const refreshStockAndMovements = () => {
    stock.refresh();
    items.refresh();
    alerts.refresh();
    movements.refresh();
    availability.refresh();
  };

  const statsLoading = items.isLoading || stock.isLoading || alerts.isLoading;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Encabezado editorial ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-2xs uppercase tracking-[0.2em] text-maison-cream-dim">
            Control de despensa · {selectedBranch.isGlobal ? 'Todas las sucursales' : selectedBranch.name}
          </p>
          <h1 className="mt-1 font-display text-2xl font-medium text-maison-cream">
            Inventario
            <span className="ml-2 font-display italic text-maison-amber">
              {isAdmin ? 'gestión total' : 'operación'}
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {canMove && (
            <button
              type="button"
              onClick={() => { setMovementPreset({}); setMovementOpen(true); }}
              className="btn-primary"
            >
              <IconActivity className="h-3.5 w-3.5" />
              Registrar movimiento
            </button>
          )}
          {isOwner && (
            <button
              type="button"
              onClick={() => { setEditingItem(null); setItemModalOpen(true); }}
              className="btn-ghost"
            >
              <IconPlus className="h-3.5 w-3.5" />
              Nuevo insumo
            </button>
          )}
        </div>
      </div>

      {/* ── Métricas ── */}
      <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', isAdmin ? 'xl:grid-cols-4' : 'xl:grid-cols-3')}>
        {statsLoading ? (
          Array.from({ length: isAdmin ? 4 : 3 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Insumos activos"
              value={String(activeItems.length)}
              icon={<IconPackage className="h-4 w-4" />}
              colorVariant="amber"
            />
            <StatCard
              label="Bajo mínimo"
              value={String(alertCount)}
              icon={<IconAlertTriangle className="h-4 w-4" />}
              colorVariant={alertCount > 0 ? 'gold' : 'sage'}
            />
            <StatCard
              label="Movimientos hoy"
              value={String(todayMovements)}
              icon={<IconActivity className="h-4 w-4" />}
              colorVariant="cream"
            />
            {isAdmin && pantryValue !== null && (
              <StatCard
                label="Valor de despensa"
                value={formatMoney(pantryValue)}
                icon={<IconDollarSign className="h-4 w-4" />}
                colorVariant="sage"
              />
            )}
          </>
        )}
      </div>

      {/* ── Tabs ── */}
      <div role="tablist" aria-label="Secciones de inventario" className="flex gap-1 overflow-x-auto border-b border-maison-border">
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
            {TAB_LABELS[t]}
            {t === 'alertas' && alertCount > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-maison-ruby-bg px-1 font-mono text-2xs text-maison-ruby">
                {alertCount}
              </span>
            )}
            {tab === t && (
              <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-t bg-maison-amber" aria-hidden="true" />
            )}
          </button>
        ))}
      </div>

      {/* ── Contenido ── */}
      <section className="animate-fade-in" role="tabpanel">
        {tab === 'despensa' && (
          items.isLoading ? (
            <TableSkeleton />
          ) : items.error ? (
            <ErrorNote message={items.error.message} />
          ) : (
            <ItemsTable
              items={items.data ?? []}
              showCosts={isAdmin}
              onEdit={isOwner ? (item) => { setEditingItem(item); setItemModalOpen(true); } : undefined}
              onDelete={isOwner ? (item) => setDeletingItem(item) : undefined}
            />
          )
        )}

        {tab === 'kardex' && (
          movements.isLoading ? (
            <TableSkeleton />
          ) : movements.error ? (
            <ErrorNote message={movements.error.message} />
          ) : (
            <MovementsLedger movements={movements.data ?? []} showCosts={isAdmin} />
          )
        )}

        {tab === 'alertas' && (
          alerts.isLoading ? (
            <TableSkeleton />
          ) : alerts.error ? (
            <ErrorNote message={alerts.error.message} />
          ) : (
            <div className="flex flex-col gap-4">
              <AlertsPanel alerts={alerts.data ?? []} />
              {canMove && (alerts.data?.length ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMovementPreset({ type: 'PURCHASE' });
                    setMovementOpen(true);
                  }}
                  className="btn-primary self-start"
                >
                  <IconPlus className="h-3.5 w-3.5" />
                  Registrar entrada
                </button>
              )}
            </div>
          )
        )}

        {tab === 'recetas' && (
          <RecipesPanel
            menuItems={availability.data ?? []}
            inventoryItems={items.data ?? []}
            canEdit={isAdmin}
          />
        )}

        {tab === 'proveedores' && isOwner && (
          suppliers.isLoading ? (
            <TableSkeleton />
          ) : (
            <SuppliersPanel suppliers={suppliers.data ?? []} onChanged={suppliers.refresh} />
          )
        )}

        {tab === 'disponibilidad' && (
          availability.isLoading ? (
            <TableSkeleton />
          ) : (
            <AvailabilityBoard items={availability.data ?? []} />
          )
        )}
      </section>

      {/* ── Modales ── */}
      <MovementModal
        open={movementOpen}
        onClose={() => setMovementOpen(false)}
        onSuccess={refreshStockAndMovements}
        role={role}
        items={(items.data ?? []).filter((i) => i.isActive).map((i) => ({ id: i.id, name: i.name, unit: i.unit }))}
        branches={branchOptions}
        suppliers={suppliers.data ?? []}
        showCosts={isAdmin || role === 'MANAGER'}
        initialItemId={movementPreset.itemId}
        initialType={movementPreset.type}
      />

      {isOwner && (
        <ItemModal
          open={itemModalOpen}
          onClose={() => setItemModalOpen(false)}
          onSuccess={() => { items.refresh(); stock.refresh(); alerts.refresh(); }}
          suppliers={suppliers.data ?? []}
          item={editingItem}
        />
      )}

      <ConfirmDialog
        open={deletingItem !== null}
        title="Desactivar insumo"
        description={deletingItem ? `¿Seguro que quieres desactivar "${deletingItem.name}"? Las existencias y el historial se conservan, pero dejará de aparecer como activo. Puedes reactivarlo luego desde "Editar".` : ''}
        confirmLabel="Desactivar"
        isLoading={isDeletingItem}
        onConfirm={handleConfirmDeleteItem}
        onCancel={() => setDeletingItem(null)}
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded border border-maison-ruby/40 bg-maison-ruby-bg px-4 py-3 text-sm text-maison-ruby">
      {message}
    </p>
  );
}
