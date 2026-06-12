import { cn } from './cn';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return <div className={cn('skeleton', className)} style={style} aria-hidden="true" />;
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3.5', i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-11 w-11' };
  return <Skeleton className={cn('rounded-full flex-shrink-0', sizes[size])} />;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('card p-5 flex flex-col gap-4', className)} aria-hidden="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-7 w-7 rounded" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  const widths = ['w-24', 'w-32', 'w-20', 'w-16', 'w-12'];
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 border-b border-maison-border"
      aria-hidden="true"
    >
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5 flex-1', widths[i % widths.length])} />
      ))}
    </div>
  );
}
