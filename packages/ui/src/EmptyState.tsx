import { cn } from './cn';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-14 text-center px-6',
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-2 border border-maison-border text-maison-cream-dim">
        {icon}
      </div>
      <div className="flex flex-col gap-1.5 max-w-xs">
        <p className="text-sm font-medium text-maison-cream">{title}</p>
        <p className="text-xs text-maison-cream-muted leading-relaxed">{description}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
