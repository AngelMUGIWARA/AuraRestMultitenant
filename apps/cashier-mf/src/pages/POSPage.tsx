import { useState } from 'react';
import { usePOS } from '../hooks/usePOS';
import type { MenuItem, RestaurantTable, PaymentMethod } from '@maison/types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(value);
}

const TABLE_STATUS_COLOR: Record<string, string> = {
  free: 'border-maison-sage/50 bg-maison-sage/10',
  occupied: 'border-maison-ruby/50 bg-maison-ruby/10',
  reserved: 'border-maison-amber/50 bg-maison-amber/10',
  maintenance: 'border-white/20 bg-surface-2',
};

function MenuItemCard({ item, onAdd }: { item: MenuItem; onAdd: (item: MenuItem) => void }) {
  return (
    <button type="button" onClick={() => onAdd(item)}
      className="card card-hover text-left p-3 flex flex-col gap-1.5 transition">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-maison-cream leading-snug">{item.name}</span>
        {item.isPopular && <span className="flex-shrink-0 text-2xs font-semibold text-maison-amber bg-maison-amber-glow rounded px-1.5 py-0.5">Popular</span>}
      </div>
      {item.categoryName && <span className="text-2xs text-maison-cream-dim">{item.categoryName}</span>}
      <span className="font-mono text-sm font-medium text-maison-amber mt-auto">{formatCurrency(item.price)}</span>
    </button>
  );
}

function TableCard({ table, isSelected, onSelect }: { table: RestaurantTable; isSelected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect}
      className={`rounded-xl border-2 p-3 text-center transition ${TABLE_STATUS_COLOR[table.status] ?? 'border-white/20 bg-surface-2'} ${isSelected ? 'ring-2 ring-maison-amber ring-offset-1 ring-offset-surface-0' : ''}`}>
      <p className="text-sm font-semibold text-maison-cream">{table.name}</p>
      <p className="text-2xs text-maison-cream-muted mt-0.5">{table.capacity} pers.</p>
      <p className="text-2xs font-medium mt-1 capitalize text-maison-cream-dim">{table.status}</p>
    </button>
  );
}

type PosView = 'tables' | 'menu' | 'payment';

export default function POSPage() {
  const {
    menuItems, tables, cart, selectedTable, setSelectedTable,
    cartTotal, cartSubtotal, cartTax,
    isLoading, isSubmitting, error, completedOrder,
    addToCart, removeFromCart, clearCart, submitOrder, processPayment,
  } = usePOS();

  const [view, setView] = useState<PosView>('tables');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(menuItems.map((i) => i.categoryName)))];
  const filteredItems = menuItems.filter((i) => {
    const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || i.categoryName === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  async function handleSubmitOrder() {
    if (!customerName.trim()) return;
    await submitOrder(customerName);
    setView('payment');
  }

  async function handlePayment() {
    await processPayment(paymentMethod, cartTotal);
    setCustomerName('');
    setView('tables');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 rounded-full border-2 border-maison-amber border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-maison-cream-muted">Cargando POS…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      {/* POS Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-maison-border bg-surface-1 px-5">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5 text-maison-amber" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 10h20" /></svg>
          <span className="font-display text-lg font-medium text-maison-cream">Caja / POS</span>
        </div>
        <div className="flex items-center gap-2">
          {(['tables', 'menu', 'payment'] as PosView[]).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition capitalize ${view === v ? 'bg-maison-amber text-surface-0' : 'text-maison-cream-muted hover:bg-surface-2'}`}>
              {v === 'tables' ? 'Mesas' : v === 'menu' ? 'Carta' : 'Cobro'}
            </button>
          ))}
        </div>
        <span className="text-xs text-maison-cream-muted">{cart.length} items en carrito</span>
      </header>

      {error && (
        <div className="mx-5 mt-4 rounded-lg bg-maison-ruby/10 border border-maison-ruby/30 px-4 py-2">
          <p className="text-xs text-maison-ruby">{error}</p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TABLES VIEW */}
          {view === 'tables' && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-maison-cream">Seleccionar mesa</h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {tables.map((t) => (
                  <TableCard key={t.id} table={t} isSelected={selectedTable?.id === t.id}
                    onSelect={() => { setSelectedTable(selectedTable?.id === t.id ? null : t); }} />
                ))}
              </div>
              {tables.length === 0 && <p className="text-sm text-maison-cream-muted text-center py-12">Sin mesas configuradas</p>}
              <button type="button" onClick={() => setView('menu')}
                className="w-full mt-4 rounded-lg bg-maison-amber text-surface-0 py-3 text-sm font-medium hover:bg-maison-amber/90 transition">
                {selectedTable ? `Continuar con mesa ${selectedTable.name}` : 'Continuar sin mesa (para llevar)'}
              </button>
            </div>
          )}

          {/* MENU VIEW */}
          {view === 'menu' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <input type="search" placeholder="Buscar en la carta…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 rounded-lg border border-maison-border bg-surface-1 px-3 py-2 text-sm text-maison-cream placeholder:text-maison-cream-dim focus:outline-none focus:border-maison-amber" />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {categories.map((cat) => (
                  <button key={cat} type="button" onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${selectedCategory === cat ? 'border-maison-amber bg-maison-amber-glow text-maison-amber' : 'border-maison-border bg-surface-1 text-maison-cream-muted hover:bg-surface-2'}`}>
                    {cat === 'all' ? 'Todo' : cat}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredItems.map((item) => <MenuItemCard key={item.id} item={item} onAdd={addToCart} />)}
              </div>
              {filteredItems.length === 0 && <p className="text-center text-sm text-maison-cream-muted py-12">Sin items encontrados</p>}
            </div>
          )}

          {/* PAYMENT VIEW */}
          {view === 'payment' && (
            <div className="max-w-md mx-auto space-y-5">
              {completedOrder ? (
                <>
                  <div className="card p-5 space-y-4">
                    <h2 className="text-sm font-medium text-maison-cream">Cobrar orden #{completedOrder.orderNumber}</h2>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm text-maison-cream-muted"><span>Subtotal</span><span className="font-mono">{formatCurrency(completedOrder.subtotal)}</span></div>
                      <div className="flex justify-between text-sm text-maison-cream-muted"><span>IVA 16%</span><span className="font-mono">{formatCurrency(completedOrder.tax)}</span></div>
                      <div className="flex justify-between text-base font-bold text-maison-cream border-t border-maison-border pt-2 mt-2"><span>Total</span><span className="font-mono text-maison-amber">{formatCurrency(completedOrder.total)}</span></div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-maison-cream-dim uppercase tracking-wider">Método de pago</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['cash', 'card', 'qr'] as PaymentMethod[]).map((m) => (
                          <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                            className={`rounded-lg border py-2.5 text-xs font-medium transition capitalize ${paymentMethod === m ? 'border-maison-amber bg-maison-amber-glow text-maison-amber' : 'border-maison-border bg-surface-2 text-maison-cream-muted hover:bg-surface-3'}`}>
                            {m === 'cash' ? 'Efectivo' : m === 'card' ? 'Tarjeta' : 'QR'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button type="button" onClick={handlePayment} disabled={isSubmitting}
                      className="w-full rounded-lg bg-maison-sage text-surface-0 py-3 text-sm font-medium hover:bg-maison-sage/90 transition disabled:opacity-50">
                      {isSubmitting ? 'Procesando…' : `Cobrar ${formatCurrency(completedOrder.total)}`}
                    </button>
                  </div>
                  <button type="button" onClick={clearCart} className="w-full text-xs text-maison-cream-muted hover:text-maison-cream transition text-center">
                    Cancelar y nueva orden
                  </button>
                </>
              ) : (
                <div className="card p-5 space-y-4">
                  <h2 className="text-sm font-medium text-maison-cream">Confirmar orden</h2>
                  <div>
                    <label className="text-xs font-medium text-maison-cream-dim uppercase tracking-wider block mb-1">Nombre del cliente</label>
                    <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-lg border border-maison-border bg-surface-1 px-3 py-2 text-sm text-maison-cream focus:outline-none focus:border-maison-amber" placeholder="Nombre para la orden" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm text-maison-cream-muted"><span>Subtotal</span><span className="font-mono">{formatCurrency(cartSubtotal)}</span></div>
                    <div className="flex justify-between text-sm text-maison-cream-muted"><span>IVA 16%</span><span className="font-mono">{formatCurrency(cartTax)}</span></div>
                    <div className="flex justify-between text-base font-bold text-maison-cream border-t border-maison-border pt-2"><span>Total</span><span className="font-mono text-maison-amber">{formatCurrency(cartTotal)}</span></div>
                  </div>
                  <button type="button" onClick={handleSubmitOrder} disabled={isSubmitting || !customerName.trim() || cart.length === 0}
                    className="w-full rounded-lg bg-maison-amber text-surface-0 py-3 text-sm font-medium hover:bg-maison-amber/90 transition disabled:opacity-50">
                    {isSubmitting ? 'Enviando a cocina…' : 'Enviar a cocina'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart sidebar */}
        <div className="w-72 flex-shrink-0 border-l border-maison-border bg-surface-1 flex flex-col hidden lg:flex">
          <div className="px-4 py-3 border-b border-maison-border">
            <h3 className="text-sm font-medium text-maison-cream">
              Carrito {selectedTable && <span className="text-maison-cream-dim">— {selectedTable.name}</span>}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 && <p className="text-xs text-maison-cream-dim text-center py-8">Sin items en el carrito</p>}
            {cart.map((item) => (
              <div key={item.menuItem.id} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
                <span className="font-mono text-sm font-bold text-maison-amber w-5 flex-shrink-0">{item.quantity}×</span>
                <span className="flex-1 text-xs text-maison-cream truncate">{item.menuItem.name}</span>
                <span className="font-mono text-xs text-maison-cream-muted flex-shrink-0">{formatCurrency(item.menuItem.price * item.quantity)}</span>
                <button type="button" onClick={() => removeFromCart(item.menuItem.id)} className="text-maison-cream-dim hover:text-maison-ruby transition" aria-label="Quitar">×</button>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-maison-border space-y-3">
            <div className="flex justify-between text-sm font-bold text-maison-cream">
              <span>Total</span>
              <span className="font-mono text-maison-amber">{formatCurrency(cartTotal)}</span>
            </div>
            <button type="button" onClick={() => { if (cart.length > 0) setView('payment'); }}
              disabled={cart.length === 0}
              className="w-full rounded-lg bg-maison-amber text-surface-0 py-2.5 text-sm font-medium hover:bg-maison-amber/90 transition disabled:opacity-40">
              Cobrar
            </button>
            {cart.length > 0 && <button type="button" onClick={clearCart} className="w-full text-xs text-maison-cream-muted hover:text-maison-cream transition">Limpiar carrito</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
