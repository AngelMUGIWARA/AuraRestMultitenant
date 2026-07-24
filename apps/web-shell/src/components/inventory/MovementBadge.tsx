import type { InventoryMovementType } from '@maison/types';
import { cn } from '@/lib/utils';
import { MOVEMENT_META } from './inventory-meta';

export function MovementBadge({ type }: { type: InventoryMovementType }) {
  const meta = MOVEMENT_META[type];
  return (
    <span className={cn('badge', meta.chipClass)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dotClass)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
