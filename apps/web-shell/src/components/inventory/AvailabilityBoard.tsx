'use client';

import type { MenuAvailability } from '@maison/types';
import { EmptyState, IconMenus } from '@maison/ui';
import { cn } from '@/lib/utils';

interface AvailabilityBoardProps {
  items: MenuAvailability[];
  /** Al hacer click en un platillo (p. ej. ver receta) */
  onSelect?: (item: MenuAvailability) => void;
  selectedId?: string;
  /** KITCHEN_STAFF/MANAGER/OWNER: permite marcar manualmente agotado/disponible */
  onToggleAvailable?: (item: MenuAvailability) => void;
  togglingId?: string | null;
}

/** Tablero de disponibilidad: lectura para sala/caja, editable para cocina/manager/owner */
export function AvailabilityBoard({ items, onSelect, selectedId, onToggleAvailable, togglingId }: AvailabilityBoardProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<IconMenus className="h-6 w-6" />}
        title="Sin platillos"
        description="No hay platillos en el menú para evaluar disponibilidad."
      />
    );
  }

  const availableCount = items.filter((i) => i.available).length;

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-2xs uppercase tracking-widest text-maison-cream-dim">
        {availableCount}/{items.length} disponibles
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, idx) => {
          const Tag = onSelect && !onToggleAvailable ? 'button' : 'div';
          return (
            <Tag
              key={item.menuItemId}
              {...(onSelect ? { type: 'button' as const, onClick: () => onSelect(item) } : {})}
              className={cn(
                'card animate-slide-in-up flex items-center gap-2.5 px-3.5 py-2.5 text-left',
                onSelect && 'card-hover cursor-pointer',
                selectedId === item.menuItemId && 'border-maison-amber shadow-amber-glow',
                !item.available && 'opacity-80',
              )}
              style={{ animationDelay: `${Math.min(idx * 25, 350)}ms`, animationFillMode: 'backwards' }}
            >
              <span
                className={cn(
                  'h-2 w-2 flex-shrink-0 rounded-full',
                  item.available ? 'bg-maison-sage' : 'bg-maison-ruby animate-pulse-soft',
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-sm',
                  item.available ? 'text-maison-cream' : 'text-maison-cream-dim line-through decoration-maison-ruby/60',
                )}
              >
                {item.name}
              </span>
              {onToggleAvailable ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleAvailable(item); }}
                  disabled={togglingId === item.menuItemId}
                  className={cn(
                    'flex-shrink-0 rounded border px-2 py-1 font-mono text-2xs uppercase tracking-wider transition-colors disabled:opacity-50',
                    item.available
                      ? 'border-maison-sage/30 text-maison-sage hover:border-maison-ruby/40 hover:bg-maison-ruby-bg hover:text-maison-ruby'
                      : 'border-maison-ruby/30 text-maison-ruby hover:border-maison-sage/40 hover:bg-maison-sage-bg hover:text-maison-sage',
                  )}
                  aria-label={item.available ? `Marcar ${item.name} como agotado` : `Marcar ${item.name} como disponible`}
                >
                  {togglingId === item.menuItemId ? '…' : item.available ? 'Marcar agotado' : 'Marcar disponible'}
                </button>
              ) : (
                <span
                  className={cn(
                    'font-mono text-2xs uppercase tracking-wider',
                    item.available ? 'text-maison-sage' : 'text-maison-ruby',
                  )}
                >
                  {item.available ? 'Sí' : 'Agotado'}
                </span>
              )}
            </Tag>
          );
        })}
      </div>
    </div>
  );
}
