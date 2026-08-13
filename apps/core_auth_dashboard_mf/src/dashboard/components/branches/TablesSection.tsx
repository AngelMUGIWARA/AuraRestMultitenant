import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { RestaurantTable } from '@maison/types';
import { tablesService } from '../../services/tables.service';

interface TablesSectionProps {
  branchId: string;
  onTableCountChange?: (count: number) => void;
  isEditing: boolean;
}

interface PendingTableBatch {
  quantity: number;
  capacity: number;
}

export interface TablesSectionRef {
  getPendingChanges: () => {
    newTables: PendingTableBatch | null;
    tableUpdates: Array<{ tableId: string; capacity: number }>;
    tableRemovals: string[];
  };
  clearPendingChanges: () => void;
  refetchTables: () => Promise<void>;
}

const FIELD = 'flex flex-col gap-1.5';
const LABEL = 'text-2xs font-semibold uppercase tracking-widest text-maison-cream-dim';

export const TablesSection = forwardRef<TablesSectionRef, TablesSectionProps>(
  ({ branchId, onTableCountChange, isEditing }, ref) => {
    const [tables, setTables] = useState<RestaurantTable[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Pending changes state - only in edit mode
    const [newTableCount, setNewTableCount] = useState('');
    const [newTableCapacity, setNewTableCapacity] = useState('4');
    const [showAddForm, setShowAddForm] = useState(false);
    const [tableUpdates, setTableUpdates] = useState<Map<string, number>>(new Map());
    const [tableRemovals, setTableRemovals] = useState<Set<string>>(new Set());

    useEffect(() => {
      loadTables();
    }, [branchId]);

    async function loadTables() {
      try {
        setLoading(true);
        setError(null);
        const response = await tablesService.getByBranch(branchId);
        const tablesData = response.data || [];
        setTables(tablesData);
        onTableCountChange?.(tablesData.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando mesas');
      } finally {
        setLoading(false);
      }
    }

    function handleAddTableDraft() {
      if (!newTableCount || parseInt(newTableCount) < 1) {
        setError('Cantidad debe ser mayor a 0');
        return;
      }

      const quantity = parseInt(newTableCount);
      const capacity = parseInt(newTableCapacity) || 4;

      if (!Number.isInteger(quantity) || !Number.isInteger(capacity)) {
        setError('Cantidad y capacidad deben ser números enteros');
        return;
      }

      if (capacity < 1) {
        setError('Capacidad debe ser al menos 1');
        return;
      }

      console.info('[TABLES DRAFT] Pending batch:', { quantity, capacity });
      setError(null);
      // Los cambios se guardan en el estado local y se registran en el ref
    }

    function handleCancelAddForm() {
      setShowAddForm(false);
      setNewTableCount('');
      setNewTableCapacity('4');
      setError(null);
    }

    function handleEditTable(tableId: string) {
      setEditingId(tableId);
    }

    function handleSaveTableEdit(table: RestaurantTable, newCapacity: number) {
      if (!Number.isInteger(newCapacity) || newCapacity < 1) {
        setError('Capacidad debe ser un número entero >= 1');
        return;
      }

      console.info('[TABLES DRAFT] Update table:', { tableId: table.id, capacity: newCapacity });
      setTableUpdates(prev => new Map(prev).set(table.id, newCapacity));
      setEditingId(null);
      setError(null);
    }

    function handleMarkTableForRemoval(tableId: string) {
      if (!confirm('¿Desactivar esta mesa?')) return;

      console.info('[TABLES DRAFT] Mark for removal:', tableId);
      setTableRemovals(prev => new Set(prev).add(tableId));
      setError(null);
    }

    // Expose ref methods for parent to collect pending changes
    useImperativeHandle(ref, () => ({
      getPendingChanges: () => {
        const newTables = (newTableCount && parseInt(newTableCount) > 0)
          ? {
              quantity: parseInt(newTableCount),
              capacity: parseInt(newTableCapacity) || 4,
            }
          : null;

        return {
          newTables,
          tableUpdates: Array.from(tableUpdates.entries()).map(([tableId, capacity]) => ({
            tableId,
            capacity,
          })),
          tableRemovals: Array.from(tableRemovals),
        };
      },
      clearPendingChanges: () => {
        setNewTableCount('');
        setNewTableCapacity('4');
        setShowAddForm(false);
        setTableUpdates(new Map());
        setTableRemovals(new Set());
        setEditingId(null);
      },
      refetchTables: loadTables,
    }), [newTableCount, newTableCapacity, tableUpdates, tableRemovals]);

    const totalCapacity = tables.reduce((sum, t) => sum + (t.isActive && !tableRemovals.has(t.id) ? t.capacity : 0), 0);

    const activeTablesCount = tables.filter(t => t.isActive && !tableRemovals.has(t.id)).length;
    const pendingNewCount = newTableCount ? parseInt(newTableCount) : 0;
    const displayTablesCount = activeTablesCount + pendingNewCount;
    const maxNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) : 0;

    return (
      <div className="border-t border-maison-border pt-4 mt-4">
        <div className="flex items-center justify-between mb-4">
          <span className={LABEL}>
            Mesas ({displayTablesCount}) • Capacidad total: {totalCapacity + (pendingNewCount > 0 ? parseInt(newTableCapacity || '4') * pendingNewCount : 0)}
          </span>
          {!showAddForm && isEditing && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="text-xs px-2 py-1 bg-maison-accent text-maison-brand rounded hover:bg-maison-accent-hover"
            >
              + Agregar
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded border border-maison-ruby/40 bg-maison-ruby-bg px-3 py-2 text-xs text-maison-ruby mb-3">
            {error}
          </p>
        )}

        {loading && <p className="text-sm text-maison-cream-muted">Cargando...</p>}

        {showAddForm && isEditing && (
          <div className="bg-maison-surface rounded p-3 mb-4 border border-maison-border">
            <div className="flex gap-2 items-end">
              <div className={`${FIELD} flex-1 min-w-0`}>
                <span className={LABEL}>Cantidad</span>
                <input
                  type="number"
                  min="1"
                  value={newTableCount}
                  onChange={(e) => setNewTableCount(e.target.value)}
                  className="input-base w-full min-w-0"
                  placeholder="1"
                  required
                />
              </div>
              <div className={`${FIELD} flex-1 min-w-0`}>
                <span className={LABEL}>Capacidad</span>
                <input
                  type="number"
                  min="1"
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(e.target.value)}
                  className="input-base w-full min-w-0"
                  placeholder="4"
                />
              </div>
              <button type="button" onClick={handleAddTableDraft} className="btn-primary btn-sm">
                Agregar
              </button>
              <button
                type="button"
                onClick={handleCancelAddForm}
                className="btn-ghost btn-sm"
              >
                Cancelar
              </button>
            </div>
            {pendingNewCount > 0 && (
              <p className="text-xs text-maison-cream-muted mt-2">
                {pendingNewCount} mesa{pendingNewCount > 1 ? 's' : ''} pendiente{pendingNewCount > 1 ? 's' : ''} de guardar
              </p>
            )}
          </div>
        )}

        {!loading && tables.length === 0 && !showAddForm && (
          <p className="text-sm text-maison-cream-muted italic">Sin mesas configuradas. Crea la primera.</p>
        )}

        <div className="space-y-2">
          {tables.filter(t => t.isActive && !tableRemovals.has(t.id)).map((table) => (
            <div
              key={table.id}
              className="flex items-center justify-between p-3 bg-maison-surface rounded border border-maison-border"
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="font-semibold text-maison-cream-bright">Mesa {table.number}</span>
                {editingId === table.id && isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      defaultValue={table.capacity}
                      onBlur={(e) => {
                        const capacity = parseInt(e.target.value) || table.capacity;
                        handleSaveTableEdit(table, capacity);
                      }}
                      className="input-base w-16"
                      autoFocus
                    />
                    <span className="text-sm text-maison-cream-muted">personas</span>
                  </div>
                ) : (
                  <span
                    onClick={() => isEditing && handleEditTable(table.id)}
                    className={`text-sm text-maison-cream-muted ${isEditing ? 'cursor-pointer hover:text-maison-cream-bright' : ''}`}
                  >
                    {table.capacity} personas
                  </span>
                )}
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => handleMarkTableForRemoval(table.id)}
                  className="text-xs px-2 py-1 text-maison-ruby hover:bg-maison-ruby-bg rounded"
                >
                  Eliminar
                </button>
              )}
            </div>
          ))}

          {pendingNewCount > 0 && (
            <>
              {Array.from({ length: pendingNewCount }).map((_, i) => (
                <div
                  key={`pending-${i}`}
                  className="flex items-center justify-between p-3 bg-maison-surface rounded border border-maison-border opacity-60"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-semibold text-maison-cream-bright">
                      Mesa {maxNumber + i + 1}
                      <span className="ml-2 text-xs text-maison-accent">NUEVA</span>
                    </span>
                    <span className="text-sm text-maison-cream-muted">
                      {newTableCapacity || 4} personas
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  },
);
