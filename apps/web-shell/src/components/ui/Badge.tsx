import { cn } from '@/lib/utils';
import type { TenantStatus, TenantPlan } from '@maison/types';
import { TENANT_STATUS_LABELS, PLAN_LABELS } from '@/lib/constants';

const STATUS_CLASSES: Record<TenantStatus, string> = {
  active: 'badge-active',
  inactive: 'badge-inactive',
  suspended: 'badge-suspended',
  trial: 'badge-trial',
};

export function StatusBadge({ status }: { status: TenantStatus }) {
  return (
    <span className={cn('badge', STATUS_CLASSES[status])}>
      <span className="h-1 w-1 rounded-full bg-current" />
      {TENANT_STATUS_LABELS[status]}
    </span>
  );
}

const PLAN_CLASSES: Record<TenantPlan, string> = {
  starter: 'badge badge-inactive',
  professional: 'badge bg-maison-amber-glow text-maison-amber',
  enterprise: 'badge bg-maison-ruby-bg text-maison-ruby',
};

export function PlanBadge({ plan }: { plan: TenantPlan }) {
  return <span className={PLAN_CLASSES[plan]}>{PLAN_LABELS[plan]}</span>;
}
