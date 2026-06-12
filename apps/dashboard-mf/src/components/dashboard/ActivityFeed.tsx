import { cn, formatRelativeTime } from '../../utils';
import { Skeleton, SkeletonAvatar, EmptyState, IconActivity, IconUserPlus, IconTrendingUp, IconPayment, IconBan, IconMenus, IconAlertCircle } from '@maison/ui';
import type { ActivityItem, ActivityEventType } from '@maison/types';

const EVENT_CONFIG: Record<ActivityEventType, { icon: React.ComponentType<{ className?: string }>; colorClass: string }> = {
  tenant_created: { icon: IconUserPlus, colorClass: 'text-maison-sage' },
  user_registered: { icon: IconUserPlus, colorClass: 'text-maison-amber' },
  plan_upgraded: { icon: IconTrendingUp, colorClass: 'text-maison-gold' },
  payment_received: { icon: IconPayment, colorClass: 'text-maison-sage' },
  tenant_suspended: { icon: IconBan, colorClass: 'text-maison-ruby' },
  menu_published: { icon: IconMenus, colorClass: 'text-maison-amber' },
};

interface ActivityFeedProps { items?: ActivityItem[]; isLoading?: boolean; error?: boolean; }

export function ActivityFeed({ items, isLoading = false, error = false }: ActivityFeedProps) {
  return (
    <section className="card flex flex-col" aria-labelledby="activity-title">
      <div className="flex items-center justify-between border-b border-maison-border px-5 py-3.5">
        <div>
          <h2 id="activity-title" className="text-sm font-medium text-maison-cream">Actividad Reciente</h2>
          <p className="text-2xs text-maison-cream-dim mt-0.5">Últimos eventos del sistema</p>
        </div>
        <span className="h-2 w-2 rounded-full bg-maison-sage animate-pulse-soft" aria-label="En vivo" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <ul role="list" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-start gap-3 border-b border-maison-border px-5 py-3 last:border-b-0">
                <SkeletonAvatar size="sm" /><div className="flex-1 flex flex-col gap-2"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-2.5 w-1/2" /></div><Skeleton className="h-2.5 w-10 flex-shrink-0" />
              </li>
            ))}
          </ul>
        )}
        {!isLoading && (error || !items?.length) && <EmptyState icon={<IconActivity className="h-6 w-6" />} title="Sin actividad reciente" description="Los eventos del sistema aparecerán aquí cuando el API esté disponible." className="py-10" />}
        {!isLoading && !error && items && items.length > 0 && (
          <ul role="list">
            {items.map((item) => {
              const cfg = EVENT_CONFIG[item.type] ?? { icon: IconAlertCircle, colorClass: 'text-maison-cream-muted' };
              const Icon = cfg.icon;
              return (
                <li key={item.id} className="flex items-start gap-3 border-b border-maison-border px-5 py-3 last:border-b-0 hover:bg-surface-2 transition-colors">
                  <div className={cn('mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-surface-2 border border-maison-border', cfg.colorClass)} aria-hidden="true"><Icon className="h-3.5 w-3.5" /></div>
                  <div className="min-w-0 flex-1"><p className="text-xs font-medium text-maison-cream truncate">{item.title}</p><p className="text-2xs text-maison-cream-muted mt-0.5 truncate">{item.description}</p></div>
                  <time dateTime={item.timestamp} className="flex-shrink-0 font-mono text-2xs text-maison-cream-dim pt-0.5">{formatRelativeTime(item.timestamp)}</time>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
