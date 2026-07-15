import { TableCard } from '@maison/ui';
import type { RestaurantTable } from '@maison/types';

interface TablesGridProps {
  data: RestaurantTable[];
  selectedId?: string;
  onSelect?: (table: RestaurantTable) => void;
}

export function TablesGrid({ data, selectedId, onSelect }: TablesGridProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-maison-border py-16 gap-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-10 w-10 text-maison-cream-dim opacity-40">
          <rect x="3" y="7" width="18" height="3" rx="1" />
          <path d="M6 10v7M18 10v7M9 17h6" />
        </svg>
        <p className="text-sm text-maison-cream-muted">Sin mesas configuradas</p>
        <p className="text-xs text-maison-cream-dim">Agrega mesas desde el panel de administración</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {data.map((t) => (
        <TableCard
          key={t.id}
          name={t.name}
          capacity={t.capacity}
          status={t.status}
          isSelected={selectedId === t.id}
          onSelect={() => onSelect?.(t)}
        />
      ))}
    </div>
  );
}
