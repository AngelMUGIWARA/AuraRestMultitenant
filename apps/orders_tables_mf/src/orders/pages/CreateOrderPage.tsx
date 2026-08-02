import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCreateOrder } from '../hooks/useCreateOrder';
import { useBranch } from '@maison/ui';
import { navigateTo } from '@maison/event-bus';
import type { MenuItem } from '@maison/types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(value);
}

export default function CreateOrderPage() {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('tableId');
  const {
    menuItems, cart, cartTotal, customerName, setCustomerName,
    addItem, removeItem, updateQuantity, updateNotes,
    submitOrder, isSubmitting, isLoadingMenu, error,
  } = useCreateOrder(tableId ?? undefined);
  const { selectedBranch } = useBranch();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(menuItems.map((i) => i.category?.name ?? '')))].filter(Boolean);

  const filteredItems = menuItems.filter((item) => {
    if (selectedCategory !== 'all' && item.category?.name !== selectedCategory) return false;
    return true;
  });

  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <div className="flex min-h-screen flex-col bg-surface-0">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-maison-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { navigateTo('/waiter/tables'); }}
            className="rounded-lg p-1.5 text-maison-cream-dim hover:bg-surface-2 hover:text-maison-cream transition-colors"
            aria-label="Volver"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-maison-cream">Nuevo Pedido</h1>
            <p className="text-xs text-maison-cream-muted">
              {tableId ? `Mesa seleccionada` : 'Pedido para llevar'} · {selectedBranch.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cartCount > 0 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-maison-amber text-xs font-bold text-surface-0">
              {cartCount}
            </span>
          )}
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 rounded-lg bg-maison-ruby/10 border border-maison-ruby/40 px-4 py-2 text-sm text-maison-ruby">
          {error}
        </div>
      )}

      {/* Customer Name */}
      <div className="px-4 pt-3">
        <input
          type="text"
          placeholder="Nombre del cliente (opcional)"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full rounded-lg border border-maison-border bg-surface-1 px-3 py-2 text-sm text-maison-cream placeholder:text-maison-cream-dim focus:border-maison-amber focus:outline-none"
        />
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? 'border-maison-amber bg-maison-amber/20 text-maison-amber'
                : 'border-maison-border bg-surface-1 text-maison-cream-muted hover:bg-surface-2'
            }`}
          >
            {cat === 'all' ? 'Todo' : cat}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-1 gap-4 overflow-hidden px-4 pb-4">
        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingMenu ? (
            <div className="flex items-center justify-center h-32">
              <div className="h-6 w-6 rounded-full border-2 border-maison-amber border-t-transparent animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-maison-border py-16 gap-2">
              <p className="text-sm text-maison-cream-muted">Sin productos disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredItems.map((item) => {
                const inCart = cart.find((c) => c.menuItem.id === item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addItem(item)}
                    className={`relative rounded-xl border-2 p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      inCart
                        ? 'border-maison-amber bg-maison-amber/5 shadow-sm shadow-maison-amber/10'
                        : 'border-maison-border bg-surface-1 hover:border-maison-border-subtle'
                    }`}
                  >
                    {inCart && (
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-maison-amber text-2xs font-bold text-surface-0">
                        {inCart.quantity}
                      </span>
                    )}
                    <p className="text-sm font-bold text-maison-cream truncate">{item.name}</p>
                    {item.category?.name && (
                      <p className="text-2xs text-maison-cream-dim mt-0.5">{item.category.name}</p>
                    )}
                    <p className="text-xs font-semibold text-maison-amber mt-1">{formatCurrency(item.price)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Sidebar */}
        {cart.length > 0 && (
          <div className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-maison-border bg-surface-1">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.map((c) => (
                <div key={c.menuItem.id} className="flex items-start gap-2 rounded-lg bg-surface-2 p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-maison-cream truncate">{c.menuItem.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(c.menuItem.id, c.quantity - 1)}
                        className="flex h-5 w-5 items-center justify-center rounded bg-surface-3 text-2xs text-maison-cream-dim hover:text-maison-cream"
                      >−</button>
                      <span className="w-5 text-center text-xs font-mono text-maison-cream">{c.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(c.menuItem.id, c.quantity + 1)}
                        className="flex h-5 w-5 items-center justify-center rounded bg-surface-3 text-2xs text-maison-cream-dim hover:text-maison-cream"
                      >+</button>
                    </div>
                    <input
                      type="text"
                      placeholder="Notas..."
                      value={c.notes}
                      onChange={(e) => updateNotes(c.menuItem.id, e.target.value)}
                      className="mt-1 w-full rounded border border-maison-border bg-surface-0 px-1.5 py-0.5 text-2xs text-maison-cream placeholder:text-maison-cream-dim focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-mono text-maison-cream">{formatCurrency(c.menuItem.price * c.quantity)}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(c.menuItem.id)}
                      className="text-2xs text-maison-ruby hover:text-maison-ruby/80"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-maison-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-maison-cream-dim">Total</span>
                <span className="font-mono text-sm font-bold text-maison-cream">{formatCurrency(cartTotal)}</span>
              </div>
              <button
                type="button"
                onClick={submitOrder}
                disabled={isSubmitting}
                className="w-full rounded-lg bg-maison-amber py-2.5 text-sm font-bold text-surface-0 transition-colors hover:bg-maison-amber/90 disabled:opacity-50"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar a Cocina'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
