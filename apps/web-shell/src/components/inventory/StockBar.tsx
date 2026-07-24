import { cn } from '@/lib/utils';

interface StockBarProps {
  quantity: number;
  minStock: number;
  maxStock?: number | null;
  className?: string;
}

/**
 * Gauge fino de existencias: la zona segura se dibuja en ámbar,
 * bajo mínimo cambia a rubí con pulso suave. La marca vertical
 * indica el umbral mínimo.
 */
export function StockBar({ quantity, minStock, maxStock, className }: StockBarProps) {
  // Escala: máximo configurado, o 2× el mínimo como referencia visual
  const scale = Math.max(Number(maxStock ?? 0), minStock * 2, quantity, 1);
  const fillPct = Math.min((quantity / scale) * 100, 100);
  const minPct = Math.min((minStock / scale) * 100, 100);
  const isLow = quantity < minStock;

  return (
    <div className={cn('relative h-1.5 w-full overflow-visible rounded-full bg-surface-3', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500 ease-smooth',
          isLow ? 'bg-maison-ruby animate-pulse-soft' : 'bg-gradient-to-r from-maison-amber-dim to-maison-amber',
        )}
        style={{ width: `${fillPct}%` }}
      />
      {minStock > 0 && (
        <div
          className="absolute -top-0.5 h-2.5 w-px bg-maison-cream-dim/70"
          style={{ left: `${minPct}%` }}
          title={`Mínimo: ${minStock}`}
        />
      )}
    </div>
  );
}
