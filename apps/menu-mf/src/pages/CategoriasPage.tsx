import { useState } from 'react';
import { useBranch } from '@maison/ui';
import { useCategories } from '../hooks/useCategories';
import { CategoryFormModal } from '../components/CategoryFormModal';
import { formatNumber, cn } from '../utils';
import { getRole } from '../utils/role';
import { StatCard, StatCardSkeleton } from '@maison/ui';
import { Skeleton } from '@maison/ui';
import { EmptyState } from '@maison/ui';
import { ConfirmDialog } from '@maison/ui';
import {
  IconCategories, IconPlus, IconRefresh, IconSearch, IconPencil, IconTrash,
} from '@maison/ui';
import type { Category, CreateCategoryPayload } from '@maison/types';

/* ─── Category card ─────────────────────────────────────────────── */

const ACCENT_COLORS = [
  'bg-maison-amber-glow text-maison-amber border-maison-amber/20',
  'bg-maison-sage-bg text-maison-sage border-maison-sage/20',
  'bg-maison-gold-bg text-maison-gold border-maison-gold/20',
  'bg-maison-ruby-bg text-maison-ruby border-maison-ruby/20',
];

interface CategoryCardProps {
  cat: Category;
  index: number;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
}

function CategoryCard({ cat, index, canEdit, canDelete, onEdit, onDelete }: CategoryCardProps) {
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];
  return (
    <div className="card card-hover flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border text-sm font-bold', accent)}
          aria-hidden="true"
        >
          {cat.name.charAt(0).toUpperCase()}
        </div>
        <span className={cn('badge', cat.isActive ? 'badge-active' : 'badge-inactive')}>
          <span className="h-1 w-1 rounded-full bg-current" />
          {cat.isActive ? 'Activa' : 'Inactiva'}
        </span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-maison-cream">{cat.name}</p>
        {cat.parentName && (
          <p className="mt-0.5 truncate text-2xs text-maison-cream-dim">
            en {cat.parentName}
          </p>
        )}
        {cat.description && (
          <p className="mt-1 line-clamp-2 text-xs text-maison-cream-muted">
            {cat.description}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-maison-border pt-3">
        <span className="text-2xs text-maison-cream-dim">Productos</span>
        <span className="font-mono text-xs font-medium tabular-nums text-maison-cream">
          {formatNumber(cat.productCount)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {canEdit && (
          <button
            type="button"
            onClick={() => onEdit(cat)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded border border-maison-border bg-surface-2 px-2.5 py-1 text-2xs font-medium text-maison-cream-muted transition-colors hover:bg-surface-3 hover:text-maison-cream"
            aria-label={`Editar ${cat.name}`}
          >
            <IconPencil className="h-3 w-3" />
            Editar
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(cat)}
            className="flex items-center justify-center gap-1.5 rounded border border-maison-border bg-surface-2 px-2.5 py-1 text-2xs font-medium text-maison-cream-muted transition-colors hover:border-maison-ruby/30 hover:bg-maison-ruby-bg hover:text-maison-ruby"
            aria-label={`Desactivar ${cat.name}`}
          >
            <IconTrash className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function CategoryCardSkeleton() {
  return (
    <div className="card flex flex-col gap-4 p-4" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-4/5" />
      </div>
      <div className="flex items-center justify-between border-t border-maison-border pt-3">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-2.5 w-8" />
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function CategoriasPage() {
  const { selectedBranch } = useBranch();
  const role = getRole();
  const canManage = role === 'OWNER' || role === 'MANAGER';
  const canDelete = role === 'OWNER' || role === 'MANAGER';
  const {
    stats, categories, isLoading, error, filters, setFilters, refresh,
    createCategory, updateCategory, removeCategory, isMutating,
  } = useCategories(selectedBranch.id);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const hasError = !!error;

  function handleSearch(value: string) {
    setSearch(value);
    setFilters({ search: value || undefined });
  }

  function openCreateForm() {
    setEditingCategory(null);
    setFormOpen(true);
  }

  function openEditForm(cat: Category) {
    setEditingCategory(cat);
    setFormOpen(true);
  }

  async function handleFormSubmit(payload: CreateCategoryPayload) {
    if (editingCategory) {
      await updateCategory(editingCategory.id, payload);
    } else {
      await createCategory(payload);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingCategory) return;
    await removeCategory(deletingCategory.id);
    setDeletingCategory(null);
  }

  return (
    <div className="flex flex-col gap-7 animate-fade-in">

      {/* ── Page Header ──────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium leading-none text-maison-cream">
            Categorías
          </h1>
          <p className="mt-1.5 text-sm text-maison-cream-muted">
            {selectedBranch.isGlobal
              ? 'Clasificación de productos — Todas las sucursales'
              : `Categorías — ${selectedBranch.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button type="button" onClick={refresh} className="btn-ghost" disabled={isLoading}>
            <IconRefresh className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
          {canManage && (
            <button type="button" onClick={openCreateForm} className="btn-primary">
              <IconPlus className="h-4 w-4" />
              Nueva categoría
            </button>
          )}
        </div>
      </header>

      {/* ── Métricas Primero ───────────────────────────────────
           KPIs posicionados obligatoriamente antes de cualquier tabla. */}
      <section aria-labelledby="cat-kpis">
        <h2 id="cat-kpis" className="sr-only">Métricas de categorías</h2>
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
                delta={
                  stats && stats.totalCategories > 0
                    ? `${Math.round((stats.activeCategories / stats.totalCategories) * 100)}%`
                    : undefined
                }
                deltaPositive
                deltaLabel="del total"
                icon={<IconCategories className="h-3.5 w-3.5" />}
                colorVariant="sage"
              />
              <StatCard
                label="Categorías raíz"
                value={stats ? formatNumber(stats.rootCategories) : '—'}
                icon={<IconCategories className="h-3.5 w-3.5" />}
                colorVariant="amber"
              />
              <StatCard
                label="Productos promedio"
                value={stats ? stats.avgProductsPerCategory.toFixed(0) : '—'}
                deltaLabel="productos/categoría"
                icon={<IconCategories className="h-3.5 w-3.5" />}
                colorVariant="gold"
              />
            </>
          )}
        </div>
      </section>

      {/* ── Search bar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-xs flex-1">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-maison-cream-dim" />
          <input
            type="search"
            placeholder="Buscar categoría..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="input-base w-full pl-8"
            aria-label="Buscar categorías"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {[{ label: 'Activas', value: true }, { label: 'Inactivas', value: false }].map((f) => (
            <button
              key={String(f.value)}
              type="button"
              onClick={() => setFilters({ isActive: filters.isActive === f.value ? undefined : f.value })}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                filters.isActive === f.value
                  ? 'border-maison-amber bg-maison-amber-glow text-maison-amber'
                  : 'border-maison-border bg-surface-1 text-maison-cream-muted hover:bg-surface-2',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Category cards grid ──────────────────────────────── */}
      <section aria-labelledby="cat-grid-title">
        <h2 id="cat-grid-title" className="sr-only">Listado de categorías</h2>

        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && (hasError || !categories?.data?.length) && (
          <div className="card">
            <EmptyState
              icon={<IconCategories className="h-6 w-6" />}
              title={hasError ? 'No se pudieron cargar las categorías' : 'Sin categorías'}
              description={
                hasError
                  ? 'Verifica la conexión con el API del servidor.'
                  : search
                    ? `No se encontró ninguna categoría con "${search}". Intenta otro término.`
                    : 'Aún no hay categorías. Crea la primera para organizar tu menú.'
              }
              action={
                !hasError && !search && canManage ? (
                  <button type="button" onClick={openCreateForm} className="btn-primary">
                    <IconPlus className="h-4 w-4" />
                    Crear primera categoría
                  </button>
                ) : undefined
              }
              className="py-20"
            />
          </div>
        )}

        {!isLoading && !hasError && categories?.data && categories.data.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.data.map((cat, i) => (
              <CategoryCard key={cat.id} cat={cat} index={i} canEdit={canManage} canDelete={canDelete} onEdit={openEditForm} onDelete={setDeletingCategory} />
            ))}
          </div>
        )}
      </section>

      <CategoryFormModal
        open={formOpen}
        category={editingCategory}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDialog
        open={!!deletingCategory}
        title="Desactivar categoría"
        description={
          deletingCategory
            ? `¿Seguro que quieres desactivar "${deletingCategory.name}"? Los productos existentes conservarán la categoría, pero dejará de aparecer como activa. Puedes reactivarla luego desde "Editar".`
            : ''
        }
        confirmLabel="Desactivar"
        isLoading={isMutating}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingCategory(null)}
      />
    </div>
  );
}
