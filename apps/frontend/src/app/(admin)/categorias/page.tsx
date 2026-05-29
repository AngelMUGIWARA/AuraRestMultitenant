'use client';

import { useBranch } from '@/context/BranchContext';
import { useCategories } from '@/hooks/useCategories';
import { formatNumber, cn } from '@/lib/utils';
import { StatCard, StatCardSkeleton } from '@/components/admin/dashboard/StatCard';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconCategories, IconPlus, IconRefresh } from '@/components/ui/Icons';
import type { Category } from '@/types/category.types';

function CategoryRow({ cat }: { cat: Category }) {
  return (
    <tr className="border-b border-maison-border last:border-b-0 hover:bg-surface-2 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="h-7 w-7 flex-shrink-0 rounded"
            style={{ background: cat.color ?? 'rgb(var(--color-surface-3))' }}
            aria-hidden="true"
          />
          <div>
            <p className="text-xs font-medium text-maison-cream">{cat.name}</p>
            {cat.parentName && (
              <p className="text-2xs text-maison-cream-dim">{cat.parentName}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-maison-cream-muted">{cat.slug}</td>
      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-maison-cream">
        {formatNumber(cat.productCount)}
      </td>
      <td className="px-4 py-3">
        <span className={cn('badge', cat.isActive ? 'badge-active' : 'badge-inactive')}>
          <span className="h-1 w-1 rounded-full bg-current" />
          {cat.isActive ? 'Activa' : 'Inactiva'}
        </span>
      </td>
    </tr>
  );
}

export default function CategoriasPage() {
  const { selectedBranch } = useBranch();
  const { stats, categories, isLoading, error, refresh } = useCategories(selectedBranch.id);
  const hasError = !!error;

  return (
    <div className="flex flex-col gap-7 animate-fade-in">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">Categorías</h1>
          <p className="mt-1.5 text-sm text-maison-cream-muted">
            Clasificación de productos y servicios
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button type="button" onClick={refresh} className="btn-ghost" disabled={isLoading}>
            <IconRefresh className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
          <button type="button" className="btn-primary">
            <IconPlus className="h-4 w-4" />
            Nueva categoría
          </button>
        </div>
      </header>

      {/* ── Métricas Primero ──────────────────────────────────── */}
      <section aria-labelledby="categories-kpis">
        <h2 id="categories-kpis" className="sr-only">Métricas de categorías</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
          ) : (
            <>
              <StatCard
                label="Total categorías"
                value={stats ? formatNumber(stats.totalCategories) : '—'}
                icon={<IconCategories className="h-3.5 w-3.5" />}
                colorVariant="cream"
              />
              <StatCard
                label="Activas"
                value={stats ? formatNumber(stats.activeCategories) : '—'}
                icon={<IconCategories className="h-3.5 w-3.5" />}
                colorVariant="sage"
              />
              <StatCard
                label="Principales"
                value={stats ? formatNumber(stats.rootCategories) : '—'}
                icon={<IconCategories className="h-3.5 w-3.5" />}
                colorVariant="amber"
              />
              <StatCard
                label="Promedio productos"
                value={stats ? stats.avgProductsPerCategory.toFixed(0) : '—'}
                icon={<IconCategories className="h-3.5 w-3.5" />}
                colorVariant="gold"
              />
            </>
          )}
        </div>
      </section>

      {/* Table */}
      <section className="card overflow-hidden" aria-labelledby="categories-table-title">
        <div className="flex items-center justify-between border-b border-maison-border px-5 py-3.5">
          <h2 id="categories-table-title" className="text-sm font-medium text-maison-cream">
            Listado de Categorías
          </h2>
        </div>

        {isLoading && (
          <div aria-hidden="true">
            <div className="border-b border-maison-border bg-surface-2 px-4 py-2.5">
              <div className="flex gap-3">
                {[1, 0.5, 0.3, 0.3].map((f, i) => (
                  <Skeleton key={i} className="h-2.5" style={{ flex: f }} />
                ))}
              </div>
            </div>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={4} />)}
          </div>
        )}

        {!isLoading && (hasError || !categories?.data?.length) && (
          <EmptyState
            icon={<IconCategories className="h-6 w-6" />}
            title={hasError ? 'Error al cargar categorías' : 'Sin categorías'}
            description={
              hasError
                ? 'No se pudo conectar al API. Verifica la conexión.'
                : 'Aún no hay categorías registradas. Crea la primera.'
            }
            className="py-16"
          />
        )}

        {!isLoading && !hasError && categories?.data?.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" aria-labelledby="categories-table-title">
              <thead>
                <tr className="border-b border-maison-border bg-surface-2">
                  {['Categoría', 'Slug', 'Productos', 'Estado'].map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className={cn(
                        'px-4 py-2.5 text-left text-2xs font-medium uppercase tracking-widest text-maison-cream-dim',
                        col === 'Productos' && 'text-right',
                      )}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.data.map((cat) => <CategoryRow key={cat.id} cat={cat} />)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
