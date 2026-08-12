import { useState, useEffect } from 'react';
import type { RestaurantTable } from '@maison/types';
import { tablesService } from '../../services/tables.service';

interface TablesSectionProps {
  branchId: string;
  onTableCountChange?: (count: number) => void;
}

const FIELD = 'flex flex-col gap-1.5';
const LABEL = 'text-2xs font-semibold uppercase tracking-widest text-maison-cream-dim';

export function TablesSection({ branchId, onTableCountChange }: TablesSectionProps) {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTableCount, setNewTableCount] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [showAddForm, setShowAddForm] = useState(false);

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

  async function handleAddTable(e: React.FormEvent) {
    e.preventDefault();
    if (!newTableCount || parseInt(newTableCount) < 1) {
      setError('Cantidad debe ser mayor a 0');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const count = parseInt(newTableCount);
      const capacity = parseInt(newTableCapacity) || 4;

      // Encontrar el siguiente número de mesa disponible
      const maxNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) : 0;

      for (let i = 0; i < count; i++) {
        await tablesService.create(branchId, {
          number: maxNumber + i + 1,
          capacity,
        });
      }

      setNewTableCount('');
      setNewTableCapacity('4');
      setShowAddForm(false);
      await loadTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando mesas');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateTable(table: RestaurantTable, capacity: number) {
    try {
      setError(null);
      await tablesService.update(branchId, table.id, { capacity });
      await loadTables();
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error editando mesa');
    }
  }

  async function handleDeactivateTable(tableId: string) {
    if (!confirm('¿Desactivar esta mesa?')) return;

    try {
      setError(null);
      await tablesService.delete(branchId, tableId);
      await loadTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desactivando mesa');
    }
  }

  const totalCapacity = tables.reduce((sum, t) => sum + (t.isActive ? t.capacity : 0), 0);

  return (
    <div className="border-t border-maison-border pt-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <span className={LABEL}>
          Mesas ({tables.filter(t => t.isActive).length}) • Capacidad total: {totalCapacity}
        </span>
        {!showAddForm && (
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

      {showAddForm && (
        <form onSubmit={handleAddTable} className="bg-maison-surface rounded p-3 mb-4 border border-maison-border">
          <div className="flex gap-2 items-end">
            <label className={`${FIELD} flex-1`}>
              <span className={LABEL}>Cantidad</span>
              <input
                type="number"
                min="1"
                value={newTableCount}
                onChange={(e) => setNewTableCount(e.target.value)}
                className="input-base"
                placeholder="1"
                required
              />
            </label>
            <label className={`${FIELD} flex-1`}>
              <span className={LABEL}>Capacidad</span>
              <input
                type="number"
                min="1"
                value={newTableCapacity}
                onChange={(e) => setNewTableCapacity(e.target.value)}
                className="input-base"
                placeholder="4"
              />
            </label>
            <button type="submit" disabled={loading} className="btn-primary btn-sm">
              {loading ? 'Creando...' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="btn-ghost btn-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {!loading && tables.length === 0 && !showAddForm && (
        <p className="text-sm text-maison-cream-muted italic">Sin mesas configuradas. Crea la primera.</p>
      )}

      <div className="space-y-2">
        {tables.filter(t => t.isActive).map((table) => (
          <div
            key={table.id}
            className="flex items-center justify-between p-3 bg-maison-surface rounded border border-maison-border"
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="font-semibold text-maison-cream-bright">Mesa {table.number}</span>
              {editingId === table.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    defaultValue={table.capacity}
                    onBlur={(e) => {
                      const capacity = parseInt(e.target.value) || table.capacity;
                      handleUpdateTable(table, capacity);
                    }}
                    className="input-base w-16"
                    autoFocus
                  />
                  <span className="text-sm text-maison-cream-muted">personas</span>
                </div>
              ) : (
                <span
                  onClick={() => setEditingId(table.id)}
                  className="text-sm text-maison-cream-muted cursor-pointer hover:text-maison-cream-bright"
                >
                  {table.capacity} personas
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleDeactivateTable(table.id)}
              className="text-xs px-2 py-1 text-maison-ruby hover:bg-maison-ruby-bg rounded"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
