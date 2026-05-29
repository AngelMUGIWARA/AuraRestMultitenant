import { StatCardSkeleton } from '@/components/admin/dashboard/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-7">
      {/* Header skeleton */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* KPI skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Mid row skeleton */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <div className="card p-5 flex flex-col gap-5" aria-hidden="true">
          <Skeleton className="h-4 w-24" />
          <div className="flex items-end gap-1.5 h-48">
            {[65, 40, 80, 55, 90, 70, 45, 85, 60, 75, 50, 95].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end">
                <Skeleton className="w-full rounded-sm" style={{ height: `${h}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5 flex flex-col gap-3" aria-hidden="true">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="card" aria-hidden="true">
        <div className="border-b border-maison-border px-5 py-3.5">
          <Skeleton className="h-4 w-36" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-3.5 border-b border-maison-border last:border-b-0"
          >
            <Skeleton className="h-7 w-7 rounded flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
