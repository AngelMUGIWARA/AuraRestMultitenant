'use client';

import type { MenuAvailability } from '@maison/types';
import { EmptyState, IconMenus } from '@maison/ui';
import { cn } from '@/lib/utils';

interface AvailabilityBoardProps {
  items: MenuAvailability[];
  /** Al hacer click en un platillo (p. ej. ver receta) */
  onSelect?: (item: MenuAvailability) => void;
  selectedId?: string;
}

/** Tablero de disponibilidad: la única lectura de inventario de sala/caja */
export function AvailabilityBoard({ items, onSelect, selectedId }: AvailabilityBoardProps) {
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
          const Tag = onSelect ? 'button' : 'div';
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
              <span
                className={cn(
                  'font-mono text-2xs uppercase tracking-wider',
                  item.available ? 'text-maison-sage' : 'text-maison-ruby',
                )}
              >
                {item.available ? 'Sí' : 'Agotado'}
              </span>
            </Tag>
          );
        })}
      </div>
    </div>
  );
}
