import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranch } from '@maison/ui';
import { useMenus } from '../hooks/useMenus';
import { MenuFormModal } from '../components/MenuFormModal';
import { formatCurrency, formatNumber, cn } from '../utils';
import { getRole } from '../utils/role';
import { StatCard, StatCardSkeleton } from '@maison/ui';
import { Skeleton } from '@maison/ui';
import { EmptyState } from '@maison/ui';
import { ConfirmDialog } from '@maison/ui';
import {
  IconMenus, IconTag, IconFlame, IconClock, IconPlus,
  IconRefresh, IconSearch, IconPencil, IconAlertCircle, IconTrash,
} from '@maison/ui';
import type { CreateMenuItemPayload, MenuItem, MenuItemStatus } from '@maison/types';

/* ─── Config ────────────────────────────────────────────────────── */

const STATUS_BADGE: Record<MenuItemStatus, string> = {
  AVAILABLE: 'badge-active',
  UNAVAILABLE: 'badge-inactive',
  OUT_OF_STOCK: 'badge-suspended',
};

const STATUS_LABEL: Record<MenuItemStatus, string> = {
  AVAILABLE: 'Disponible',
  UNAVAILABLE: 'No disponible',
  OUT_OF_STOCK: 'Sin stock',
};

const STATUS_FILTERS: { value: MenuItemStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'AVAILABLE', label: 'Disponibles' },
  { value: 'UNAVAILABLE', label: 'No disponibles' },
  { value: 'OUT_OF_STOCK', label: 'Sin stock' },
];

/* ─── Product card ──────────────────────────────────────────────── */

interface ProductCardProps {
  item: MenuItem;
  canManage: boolean;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
}

function ProductCard({ item, canManage, onEdit, onDelete }: ProductCardProps) {
  const hasDiscount = item.originalPrice && item.originalPrice > item.price;

  return (
    <article className="card card-hover flex flex-col gap-0 overflow-hidden">
      {/* Image placeholder */}
      <div className="relative h-32 overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full items-center justify-center"
            style={{
              background:
                'repeating-linear-gradient(45deg, rgb(var(--color-surface-2)) 0 8px, rgb(var(--color-surface-3)) 8px 16px)',
            }}
          >
            <IconMenus className="h-8 w-8 text-maison-cream-dim opacity-40" />
          </div>
        )}

        {item.isPopular && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-maison-amber-glow px-1.5 py-0.5 text-2xs font-medium text-maison-amber">
            <IconFlame className="h-2.5 w-2.5" />
            Popular
          </span>
        )}

        {item.status !== 'AVAILABLE' && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-0/70">
            <span className={cn('badge', STATUS_BADGE[item.status])}>
              {STATUS_LABEL[item.status]}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="line-clamp-2 text-sm font-medium text-maison-cream">{item.name}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-2xs text-maison-cream-muted">{item.categoryName}</span>
            {item.status === 'AVAILABLE' && (
              <span className="h-0.5 w-0.5 rounded-full bg-maison-cream-dim" />
            )}
            {item.status === 'AVAILABLE' && (
              <span className="badge-active badge text-2xs">
                <span className="h-1 w-1 rounded-full bg-current" />
                Disponible
              </span>
            )}
          </div>
        </div>

        {item.description && (
          <p className="line-clamp-2 text-2xs text-maison-cream-muted">{item.description}</p>
        )}

        {/* Prep time */}
        <div className="flex items-center gap-1 text-2xs text-maison-cream-dim">
          <IconClock className="h-3 w-3" />
          {item.preparationTime} min
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-maison-border px-4 py-3">
        <div className="flex flex-col">
          <span className="font-mono text-sm font-semibold text-maison-cream">
            {formatCurrency(item.price)}
          </span>
          {hasDiscount && (
            <span className="font-mono text-2xs text-maison-cream-dim line-through">
              {formatCurrency(item.originalPrice!)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {canManage && (
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="flex items-center gap-1.5 rounded border border-maison-border bg-surface-2 px-2.5 py-1 text-2xs font-medium text-maison-cream-muted transition-colors hover:bg-surface-3 hover:text-maison-cream"
              aria-label={`Editar ${item.name}`}
            >
              <IconPencil className="h-3 w-3" />
              Editar
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="flex items-center justify-center rounded border border-maison-border bg-surface-2 px-2 py-1 text-2xs font-medium text-maison-cream-muted transition-colors hover:border-maison-ruby/30 hover:bg-maison-ruby-bg hover:text-maison-ruby"
              aria-label={`Eliminar ${item.name}`}
            >
              <IconTrash className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="card flex flex-col gap-0 overflow-hidden" aria-hidden="true">
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="flex flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-3/4" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <div className="flex items-center justify-between border-t border-maison-border px-4 py-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-16 rounded" />
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function MenusPage() {
  const { selectedBranch } = useBranch();
  const navigate = useNavigate();
  const role = getRole();
  const canManage = role === 'OWNER' || role === 'MANAGER';
  const {
    stats, items, isLoading, error, filters, setFilters, refresh,
    createMenuItem, updateMenuItem, removeMenuItem, isMutating,
  } = useMenus(selectedBranch.id);
  const [activeStatus, setActiveStatus] = useState<MenuItemStatus | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);
  const hasError = !!error;

  function handleStatusFilter(val: MenuItemStatus | 'all') {
    setActiveStatus(val);
    setFilters({ status: val === 'all' ? undefined : val });
  }

  function openCreateForm() {
    setEditingItem(null);
    setFormOpen(true);
  }
  
  function openPrintMenu() {
  navigate('/menus/print');
  }

  function openEditForm(item: MenuItem) {
    setEditingItem(item);
    setFormOpen(true);
  }

  async function handleFormSubmit(payload: CreateMenuItemPayload) {
    if (editingItem) {
      await updateMenuItem(editingItem.id, payload);
    } else {
      await createMenuItem(payload);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingItem) return;
    await removeMenuItem(deletingItem.id);
    setDeletingItem(null);
  }

  return (
    <div className="flex flex-col gap-7 animate-fade-in">

      {/* ── Page Header ──────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium leading-none text-maison-cream">
            Menús
          </h1>
          <p className="mt-1.5 text-sm text-maison-cream-muted">
            {selectedBranch.isGlobal
              ? 'Catálogo de productos — Todas las sucursales'
              : `Menú de ${selectedBranch.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button type="button" onClick={refresh} className="btn-ghost" disabled={isLoading}>
            <IconRefresh className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={openPrintMenu}
            className="btn-ghost"
          >
            🖨️
            Imprimir menú
          </button>
          {canManage && (
            <button type="button" onClick={openCreateForm} className="btn-primary">
              <IconPlus className="h-4 w-4" />
              Nuevo producto
            </button>
          )}
        </div>
      </header>

      {/* ── Métricas Primero ─────────────────────────────────── */}
      <section aria-labelledby="menus-kpis">
        <h2 id="menus-kpis" className="sr-only">Métricas del menú</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
          ) : (
            <>
              <StatCard
                label="Total productos"
                value={stats ? formatNumber(stats.totalItems) : '—'}
                delta={stats ? `${formatNumber(stats.popularItems)} populares` : undefined}
                deltaPositive
                deltaLabel=""
                icon={<IconMenus className="h-3.5 w-3.5" />}
                colorVariant="cream"
              />
              <StatCard
                label="Disponibles"
                value={stats ? formatNumber(stats.availableItems) : '—'}
                delta={stats && stats.totalItems > 0
                  ? `${Math.round((stats.availableItems / stats.totalItems) * 100)}%`
                  : undefined}
                deltaPositive
                deltaLabel="del catálogo"
                icon={<IconTag className="h-3.5 w-3.5" />}
                colorVariant="sage"
              />
              <StatCard
                label="No disponibles"
                value={stats ? formatNumber(stats.unavailableItems) : '—'}
                icon={<IconAlertCircle className="h-3.5 w-3.5" />}
                colorVariant="gold"
              />
              <StatCard
                label="Sin stock"
                value={stats ? formatNumber(stats.outOfStockItems) : '—'}
                icon={<IconAlertCircle className="h-3.5 w-3.5" />}
                colorVariant="amber"
              />
            </>
          )}
        </div>
      </section>

      {/* ── Filter bar ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-maison-cream-dim" />
          <input
            type="search"
            placeholder="Buscar producto..."
            value={filters.search ?? ''}
            onChange={(e) => setFilters({ search: e.target.value || undefined })}
            className="input-base w-full pl-8"
            aria-label="Buscar en el menú"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => handleStatusFilter(f.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                activeStatus === f.value
                  ? 'border-maison-amber bg-maison-amber-glow text-maison-amber'
                  : 'border-maison-border bg-surface-1 text-maison-cream-muted hover:bg-surface-2',
              )}
              aria-pressed={activeStatus === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product grid ─────────────────────────────────────── */}
      <section aria-labelledby="menu-grid-title">
        <h2 id="menu-grid-title" className="sr-only">Catálogo de productos</h2>

        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && (hasError || !items?.data?.length) && (
          <div className="card">
            <EmptyState
              icon={<IconMenus className="h-6 w-6" />}
              title={hasError ? 'No se pudo cargar el menú' : 'Sin productos'}
              description={
                hasError
                  ? 'Verifica la conexión con el API del servidor.'
                  : filters.search
                    ? `No se encontró ningún producto con "${filters.search}".`
                    : 'Aún no hay productos en el catálogo. Agrega el primero.'
              }
              action={
                !hasError && !filters.search && canManage ? (
                  <button type="button" onClick={openCreateForm} className="btn-primary">
                    <IconPlus className="h-4 w-4" />
                    Agregar primer producto
                  </button>
                ) : undefined
              }
              className="py-20"
            />
          </div>
        )}

        {!isLoading && !hasError && items?.data && items.data.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.data.map((item) => (
              <ProductCard key={item.id} item={item} canManage={canManage} onEdit={openEditForm} onDelete={setDeletingItem} />
            ))}
          </div>
        )}
      </section>

      <MenuFormModal
        open={formOpen}
        item={editingItem}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDialog
        open={!!deletingItem}
        title="Eliminar producto"
        description={
          deletingItem
            ? `¿Seguro que quieres marcar "${deletingItem.name}" como no disponible? El producto dejará de mostrarse en el menú activo.`
            : ''
        }
        confirmLabel="Eliminar"
        isLoading={isMutating}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingItem(null)}
      />
    </div>
  );
}
