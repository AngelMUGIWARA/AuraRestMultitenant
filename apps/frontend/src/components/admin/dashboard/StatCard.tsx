import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { IconTrendingUp, IconTrendingDown } from '@/components/ui/Icons';

type ColorVariant = 'amber' | 'sage' | 'gold' | 'cream';

const ICON_BG: Record<ColorVariant, string> = {
  amber: 'bg-maison-amber-glow text-maison-amber',
  sage: 'bg-maison-sage-bg text-maison-sage',
  gold: 'bg-maison-gold-bg text-maison-gold',
  cream: 'bg-surface-3 text-maison-cream-muted',
};

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  deltaLabel?: string;
  icon: React.ReactNode;
  colorVariant?: ColorVariant;
}

export function StatCard({
  label,
  value,
  delta,
  deltaPositive,
  deltaLabel = 'vs mes anterior',
  icon,
  colorVariant = 'cream',
}: StatCardProps) {
  return (
    <article className="card card-hover p-5 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-maison-cream-muted">
          {label}
        </p>
        <div
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded',
            ICON_BG[colorVariant],
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>

      <div>
        <p className="stat-number">{value}</p>

        {delta !== undefined && (
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium tabular-nums',
                deltaPositive
                  ? 'bg-maison-sage-bg text-maison-sage'
                  : 'bg-maison-ruby-bg text-maison-ruby',
              )}
            >
              {deltaPositive ? (
                <IconTrendingUp className="h-2.5 w-2.5" />
              ) : (
                <IconTrendingDown className="h-2.5 w-2.5" />
              )}
              {delta}
            </span>
            <span className="text-2xs text-maison-cream-dim">{deltaLabel}</span>
          </div>
        )}
      </div>
    </article>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card p-5 flex flex-col gap-4" aria-hidden="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-7 rounded" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}
