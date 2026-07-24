'use client';

import { useEffect, useState } from 'react';
import type { InventoryItem, MenuAvailability, MenuItemRecipe } from '@maison/types';
import { EmptyState, IconMenus, IconPlus, IconX, Skeleton } from '@maison/ui';
import { cn } from '@/lib/utils';
import { inventoryService } from '@/services/inventory.service';
import { formatQty, UNIT_LABELS } from './inventory-meta';

interface RecipesPanelProps {
  /** Platillos (de /availability, accesible para todos los roles del panel) */
  menuItems: MenuAvailability[];
  /** Insumos para el editor (solo requerido si canEdit) */
  inventoryItems?: InventoryItem[];
  /** OWNER/ADMIN editan; MANAGER/CHEF solo consultan */
  canEdit: boolean;
}

interface DraftIngredient {
  inventoryItemId: string;
  quantity: string;
  notes: string;
}

/** Recetario: vincula platillos del menú con insumos de la despensa */
export function RecipesPanel({ menuItems, inventoryItems = [], canEdit }: RecipesPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<MenuItemRecipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftIngredient[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setLoading(true);
    setEditing(false);
    setError(null);

    inventoryService
      .getRecipe(selectedId)
      .then((r) => { if (!cancelled) setRecipe(r.data); })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar la receta');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [selectedId]);

  function startEditing() {
    if (!recipe) return;
    setDraft(
      recipe.ingredients.map((ing) => ({
        inventoryItemId: ing.inventoryItemId,
        quantity: String(ing.quantity),
        notes: ing.notes ?? '',
      })),
    );
    setEditing(true);
  }

  async function saveDraft() {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await inventoryService.replaceRecipe(selectedId, {
        ingredients: draft
          .filter((d) => d.inventoryItemId && Number(d.quantity) > 0)
          .map((d) => ({
            inventoryItemId: d.inventoryItemId,
            quantity: Number(d.quantity),
            ...(d.notes ? { notes: d.notes } : {}),
          })),
      });
      setRecipe(res.data);
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la receta');
    } finally {
      setSaving(false);
    }
  }

  if (menuItems.length === 0) {
    return (
      <EmptyState
        icon={<IconMenus className="h-6 w-6" />}
        title="Sin platillos"
        description="No hay platillos en el menú para asociar recetas."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
      {/* Lista de platillos */}
      <nav aria-label="Platillos" className="flex max-h-[480px] flex-col gap-1 overflow-y-auto pr-1">
        {menuItems.map((mi) => (
          <button
            key={mi.menuItemId}
            type="button"
            onClick={() => setSelectedId(mi.menuItemId)}
            className={cn(
              'flex items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors',
              selectedId === mi.menuItemId
                ? 'bg-maison-amber-glow text-maison-amber'
                : 'text-maison-cream-muted hover:bg-surface-2 hover:text-maison-cream',
            )}
          >
            <span
              className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', mi.available ? 'bg-maison-sage' : 'bg-maison-ruby')}
              aria-hidden="true"
            />
            <span className="truncate">{mi.name}</span>
          </button>
        ))}
      </nav>

      {/* Detalle de receta */}
      <div className="card min-h-[240px] p-5">
        {!selectedId ? (
          <p className="py-10 text-center text-sm text-maison-cream-dim">
            Selecciona un platillo para consultar su receta.
          </p>
        ) : loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : recipe ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-medium text-maison-cream">
                {recipe.menuItemName}
              </h3>
              {canEdit && !editing && (
                <button type="button" onClick={startEditing} className="btn-ghost">
                  Editar receta
                </button>
              )}
            </div>

            {!editing ? (
              recipe.ingredients.length === 0 ? (
                <p className="text-sm text-maison-cream-dim">
                  Este platillo aún no tiene receta configurada.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-maison-border/60">
                  {recipe.ingredients.map((ing) => (
                    <li key={ing.inventoryItemId} className="flex items-baseline justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-maison-cream">{ing.item.name}</p>
                        {ing.notes && <p className="text-2xs text-maison-cream-dim">{ing.notes}</p>}
                      </div>
                      <span className="font-mono text-sm tabular-nums text-maison-amber">
                        {formatQty(ing.quantity, ing.item.unit)}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div className="flex flex-col gap-3">
                {draft.map((row, idx) => {
                  const item = inventoryItems.find((i) => i.id === row.inventoryItemId);
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={row.inventoryItemId}
                        onChange={(e) =>
                          setDraft((d) => d.map((r, i) => (i === idx ? { ...r, inventoryItemId: e.target.value } : r)))
                        }
                        className="input-base min-w-0 flex-1"
                      >
                        <option value="">Insumo…</option>
                        {inventoryItems.map((i) => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={row.quantity}
                        onChange={(e) =>
                          setDraft((d) => d.map((r, i) => (i === idx ? { ...r, quantity: e.target.value } : r)))
                        }
                        className="input-base w-24 font-mono tabular-nums"
                        placeholder="Cant."
                        aria-label="Cantidad por porción"
                      />
                      <span className="w-10 font-mono text-2xs text-maison-cream-dim">
                        {item ? UNIT_LABELS[item.unit] : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDraft((d) => d.filter((_, i) => i !== idx))}
                        className="rounded p-1.5 text-maison-cream-dim hover:bg-surface-3 hover:text-maison-ruby"
                        aria-label="Quitar ingrediente"
                      >
                        <IconX className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setDraft((d) => [...d, { inventoryItemId: '', quantity: '', notes: '' }])}
                  className="btn-ghost self-start"
                >
                  <IconPlus className="h-3.5 w-3.5" />
                  Agregar ingrediente
                </button>

                <div className="flex justify-end gap-2 border-t border-maison-border/60 pt-3">
                  <button type="button" onClick={() => setEditing(false)} className="btn-ghost">
                    Cancelar
                  </button>
                  <button type="button" onClick={saveDraft} disabled={saving} className="btn-primary disabled:opacity-50">
                    {saving ? 'Guardando…' : 'Guardar receta'}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="rounded border border-maison-ruby/40 bg-maison-ruby-bg px-3 py-2 text-xs text-maison-ruby">
                {error}
              </p>
            )}
          </div>
        ) : error ? (
          <p role="alert" className="py-10 text-center text-sm text-maison-ruby">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
