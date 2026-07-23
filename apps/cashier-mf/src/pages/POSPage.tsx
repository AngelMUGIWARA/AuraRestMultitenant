import { useState, useCallback, useRef } from 'react';
import { usePOS } from '../hooks/usePOS';
import type { MenuItem, PaymentMethod } from '@maison/types';
import { TableCard, TABLE_STATUS_CONFIG, IconTable } from '@maison/ui';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(value);
}

/* ── Icons ──────────────────────────────────────────────────────── */

function IconMenu({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden="true">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}

function IconPayment({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden="true">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

/* ── MenuItemCard ────────────────────────────────────────────────── */

function MenuItemCard({ item, onAdd }: { item: MenuItem; onAdd: (item: MenuItem) => void }) {
  return (
    <button
      type="button"
      onClick={() => onAdd(item)}
      className="group relative rounded-xl border border-maison-border bg-surface-1 text-left p-3.5 flex flex-col gap-2 transition-all hover:border-maison-amber/50 hover:bg-surface-2 hover:shadow-lg active:scale-[0.98]"
    >
      {item.isPopular && (
        <span className="absolute top-2 right-2 text-[10px] font-bold text-maison-amber bg-maison-amber/10 border border-maison-amber/30 rounded-full px-2 py-0.5">
          ⭐ Popular
        </span>
      )}
      <div className="flex items-start gap-2 pr-16">
        <span className="text-sm font-semibold text-maison-cream leading-snug">{item.name}</span>
      </div>
      {item.categoryName && (
        <span className="text-[10px] font-medium uppercase tracking-wider text-maison-cream-dim">{item.categoryName}</span>
      )}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-maison-border/50">
        <span className="font-mono text-sm font-bold text-maison-amber">{formatCurrency(item.price)}</span>
        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-maison-amber/10 text-maison-amber group-hover:bg-maison-amber group-hover:text-surface-0 transition-colors">
          <IconPlus className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

/* ── Method icons for payment ────────────────────────────────────── */

const METHOD_ICON: Record<string, string> = {
  cash: '💵',
  card: '💳',
  transfer: '🏦',
  qr: '📱',
};

type PosView = 'tables' | 'menu' | 'payment';

/* ── POSPage ─────────────────────────────────────────────────────── */

export default function POSPage() {
  const {
    menuItems, tables, cart, selectedTable, setSelectedTable,
    cartTotal,
    isLoading, isSubmitting, error, completedOrder, availableDiscounts,
    addToCart, removeFromCart, clearCart, submitOrder, processPayment,
    applyDiscount, removeDiscount, refreshTables,
  } = usePOS();

  const [view, setView] = useState<PosView>('tables');
  const [customerName, setCustomerName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>('');

  // Split payment state
  interface PaymentLine {
    id: number;
    method: PaymentMethod;
    amount: number;
    reference: string;
  }
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>(() => [
    { id: 1, method: 'cash', amount: 0, reference: '' },
  ]);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const lineIdRef = useRef(2);

  const capturedTotal = paymentLines.reduce((sum, l) => sum + (l.amount || 0), 0);
  const remainingAmount = completedOrder?.remainingAmount ?? 0;
  const alreadyPaid = completedOrder?.paidAmount ?? 0;
  const canPay =
    !isSubmitting &&
    completedOrder &&
    completedOrder.paymentStatus !== 'paid' &&
    paymentLines.length > 0 &&
    paymentLines.every((l) => l.amount > 0) &&
    capturedTotal > 0 &&
    capturedTotal <= remainingAmount + 0.01;

  const addPaymentLine = useCallback(() => {
    const newId = lineIdRef.current++;
    setPaymentLines((prev) => [...prev, { id: newId, method: 'cash', amount: 0, reference: '' }]);
  }, []);

  const removePaymentLine = useCallback((id: number) => {
    setPaymentLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }, []);

  const updatePaymentLine = useCallback(
    (id: number, patch: Partial<Pick<PaymentLine, 'method' | 'amount' | 'reference'>>) => {
      setPaymentLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    },
    [],
  );

  const resetPaymentLines = useCallback(() => {
    setPaymentLines([{ id: 1, method: 'cash', amount: 0, reference: '' }]);
    setPaymentSuccess(false);
  }, []);

  const categories = ['all', ...Array.from(new Set(menuItems.map((i) => i.categoryName).filter(Boolean))) as string[]];
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
    if (!completedOrder || completedOrder.isFullyPaid) return;
    await processPayment(paymentLines.map((l) => ({ method: l.method, amount: l.amount, reference: l.reference || undefined })));
    setPaymentSuccess(true);
    setCustomerName('');
  }

  /* ── Loading ── */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative mx-auto h-14 w-14">
            <div className="h-14 w-14 rounded-full border-2 border-maison-amber/20" />
            <div className="absolute inset-0 h-14 w-14 rounded-full border-2 border-maison-amber border-t-transparent animate-spin" />
          </div>
          <div>
            <p className="text-sm font-medium text-maison-cream">Cargando POS…</p>
            <p className="text-xs text-maison-cream-muted mt-0.5">Preparando tu estación de trabajo</p>
          </div>
        </div>
      </div>
    );
  }

  const NAV_TABS: { id: PosView; label: string; Icon: typeof IconTable }[] = [
    { id: 'tables', label: 'Mesas', Icon: IconTable },
    { id: 'menu', label: 'Carta', Icon: IconMenu },
    { id: 'payment', label: 'Cobro', Icon: IconPayment },
  ];

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">

      {/* ── POS Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-maison-border bg-surface-1/95 backdrop-blur-sm px-5 shadow-sm">
        {/* Brand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-maison-amber/10 border border-maison-amber/30">
            <IconPayment className="h-4 w-4 text-maison-amber" />
          </div>
          <div>
            <span className="font-display text-base font-semibold text-maison-cream leading-none">Caja POS</span>
            {selectedTable && (
              <p className="text-[10px] text-maison-amber font-medium">{selectedTable.name}</p>
            )}
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="flex items-center gap-1 rounded-xl border border-maison-border bg-surface-2 p-1">
          {NAV_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                view === id
                  ? 'bg-maison-amber text-surface-0 shadow-sm'
                  : 'text-maison-cream-muted hover:text-maison-cream hover:bg-surface-3'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>

        {/* Cart count pill */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {cart.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-maison-amber/10 border border-maison-amber/30 px-3 py-1 text-xs font-semibold text-maison-amber">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-maison-amber text-surface-0 text-[9px] font-bold">{cart.length}</span>
              {cart.length === 1 ? 'item' : 'items'}
            </span>
          )}
          {cart.length === 0 && (
            <span className="text-xs text-maison-cream-dim">Carrito vacío</span>
          )}
        </div>
      </header>

      {/* ── Error banner ─────────────────────────────────────────── */}
      {error && (
        <div className="mx-5 mt-4 rounded-xl bg-maison-ruby/10 border border-maison-ruby/30 px-4 py-3 flex items-center gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-maison-ruby flex-shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-xs text-maison-ruby">{error}</p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* ── Main content ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ──── TABLES VIEW ──── */}
          {view === 'tables' && (
            <div className="space-y-5 max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-maison-cream">Seleccionar mesa</h2>
                  <p className="text-xs text-maison-cream-muted mt-0.5">Elige la mesa o continúa sin asignar una</p>
                </div>
                <button
                  type="button"
                  onClick={refreshTables}
                  className="flex items-center gap-1.5 rounded-lg border border-maison-border bg-surface-1 px-3 py-1.5 text-xs text-maison-cream-muted hover:text-maison-cream hover:bg-surface-2 transition"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
                    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                  Actualizar
                </button>
              </div>

              {/* Status legend */}
              <div className="flex flex-wrap gap-3">
                {Object.entries(TABLE_STATUS_CONFIG).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${cfg.dot.replace('animate-pulse', '')}`} />
                    <span className="text-[10px] text-maison-cream-muted">{cfg.label}</span>
                  </div>
                ))}
              </div>

              {tables.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {tables.map((t) => (
                    <TableCard
                      key={t.id}
                      name={t.name ?? `Mesa ${t.number ?? ''}`}
                      capacity={t.capacity}
                      status={t.status}
                      isSelected={selectedTable?.id === t.id}
                      onSelect={() => { setSelectedTable(selectedTable?.id === t.id ? null : t); }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-maison-border py-16 gap-3">
                  <IconTable className="h-10 w-10 text-maison-cream-dim opacity-40" />
                  <p className="text-sm text-maison-cream-muted">Sin mesas configuradas</p>
                  <p className="text-xs text-maison-cream-dim">Agrega mesas desde el panel de administración</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setView('menu')}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-maison-amber text-surface-0 py-3.5 text-sm font-semibold hover:bg-maison-amber/90 active:scale-[0.99] transition-all shadow-lg shadow-maison-amber/20"
              >
                {selectedTable ? (
                  <>
                    <IconTable className="h-4 w-4" />
                    Continuar con {selectedTable.name}
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    Continuar sin mesa (para llevar)
                  </>
                )}
              </button>
            </div>
          )}

          {/* ──── MENU VIEW ──── */}
          {view === 'menu' && (
            <div className="space-y-4">
              {menuItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-maison-border bg-surface-1/50 py-20 gap-4 max-w-md mx-auto mt-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 border border-maison-border">
                    <IconMenu className="h-8 w-8 text-maison-cream-dim opacity-60" />
                  </div>
                  <div className="text-center space-y-1.5 px-6">
                    <p className="text-base font-semibold text-maison-cream">El módulo de carta aún no está disponible</p>
                    <p className="text-sm text-maison-cream-muted">Agrega productos desde el panel de administración para comenzar a tomar pedidos.</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-maison-amber/30 bg-maison-amber/5 px-4 py-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-maison-amber" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span className="text-xs font-medium text-maison-amber">Módulo en configuración</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Search */}
                  <div className="relative">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-maison-cream-dim" aria-hidden="true">
                      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                      type="search"
                      placeholder="Buscar en la carta…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-maison-border bg-surface-1 pl-10 pr-4 py-2.5 text-sm text-maison-cream placeholder:text-maison-cream-dim focus:outline-none focus:border-maison-amber focus:ring-1 focus:ring-maison-amber/30 transition"
                    />
                  </div>

                  {/* Category chips */}
                  <div className="flex gap-2 flex-wrap">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                          selectedCategory === cat
                            ? 'bg-maison-amber text-surface-0 shadow-sm'
                            : 'border border-maison-border bg-surface-1 text-maison-cream-muted hover:bg-surface-2 hover:text-maison-cream'
                        }`}
                      >
                        {cat === 'all' ? 'Todo' : cat}
                      </button>
                    ))}
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {filteredItems.map((item) => <MenuItemCard key={item.id} item={item} onAdd={addToCart} />)}
                  </div>
                  {filteredItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10 text-maison-cream-dim opacity-40" aria-hidden="true">
                        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                      </svg>
                      <p className="text-sm text-maison-cream-muted">Sin items encontrados para "<strong className="text-maison-cream">{searchQuery}</strong>"</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ──── PAYMENT VIEW ──── */}
          {view === 'payment' && (
            <div className="max-w-lg mx-auto space-y-4">

              {completedOrder ? (
                completedOrder.isFullyPaid ? (
                  /* Already paid */
                  <div className="rounded-2xl border border-maison-border bg-surface-1 p-8 text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-maison-sage/10 border-2 border-maison-sage/30">
                      <IconCheck className="h-8 w-8 text-maison-sage" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-maison-cream">Orden #{completedOrder.orderNumber} ya pagada</p>
                      <p className="text-sm text-maison-cream-muted mt-1">Esta orden fue cobrada anteriormente.</p>
                    </div>
                    <div className="rounded-xl bg-surface-2 px-4 py-3 font-mono text-lg font-bold text-maison-sage">
                      {formatCurrency(completedOrder.total)}
                    </div>
                    <button
                      type="button"
                      onClick={() => { clearCart(); resetPaymentLines(); setView('tables'); }}
                      className="w-full rounded-xl bg-maison-amber text-surface-0 px-6 py-3 text-sm font-semibold hover:bg-maison-amber/90 transition"
                    >
                      Nueva orden
                    </button>
                  </div>

                ) : paymentSuccess ? (
                  /* Payment success */
                  <div className="rounded-2xl border border-maison-sage/30 bg-maison-sage/5 p-8 text-center space-y-4">
                    <div className="relative mx-auto h-16 w-16">
                      <div className="absolute inset-0 rounded-full bg-maison-sage/20 animate-ping" />
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-maison-sage/20 border-2 border-maison-sage/50">
                        <IconCheck className="h-8 w-8 text-maison-sage" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-maison-cream">
                        {completedOrder.isFullyPaid ? '¡Cobro exitoso!' : '¡Pago parcial registrado!'}
                      </p>
                      <p className="text-sm text-maison-cream-muted mt-1">
                        Orden #{completedOrder.orderNumber}
                      </p>
                    </div>
                    <div className="rounded-xl bg-maison-sage/10 border border-maison-sage/30 px-4 py-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-maison-sage font-medium">Total cobrado</span>
                        <span className="font-mono font-bold text-maison-sage">{formatCurrency(completedOrder.paidAmount)}</span>
                      </div>
                      {!completedOrder.isFullyPaid && (
                        <>
                          <div className="border-t border-maison-sage/20 pt-2 flex justify-between text-sm">
                            <span className="text-maison-cream-muted">Pendiente</span>
                            <span className="font-mono font-bold text-maison-ruby">{formatCurrency(completedOrder.remainingAmount)}</span>
                          </div>
                        </>
                      )}
                    </div>
                    {completedOrder.isFullyPaid ? (
                      <button
                        type="button"
                        onClick={() => { clearCart(); resetPaymentLines(); setView('tables'); }}
                        className="w-full rounded-xl bg-maison-amber text-surface-0 px-6 py-3 text-sm font-semibold hover:bg-maison-amber/90 transition shadow-lg shadow-maison-amber/20"
                      >
                        Nueva orden
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => { resetPaymentLines(); setPaymentSuccess(false); }}
                          className="w-full rounded-xl bg-maison-amber text-surface-0 px-6 py-3 text-sm font-semibold hover:bg-maison-amber/90 transition shadow-lg shadow-maison-amber/20"
                        >
                          Cobrar restante ({formatCurrency(completedOrder.remainingAmount)})
                        </button>
                        <button
                          type="button"
                          onClick={() => { clearCart(); resetPaymentLines(); setView('tables'); }}
                          className="w-full rounded-xl border border-maison-border bg-surface-2 text-maison-cream-muted px-6 py-2.5 text-xs font-semibold hover:text-maison-cream hover:bg-surface-3 transition"
                        >
                          Dejar como pago parcial
                        </button>
                      </div>
                    )}
                  </div>

                ) : (
                  /* Payment form */
                  <>
                    {/* Order summary */}
                    <div className="rounded-2xl border border-maison-border bg-surface-1 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-maison-cream">
                          Cobrar orden <span className="text-maison-amber">#{completedOrder.orderNumber}</span>
                        </h2>
                        <span className="text-xs text-maison-cream-dim rounded-full border border-maison-border px-2.5 py-1 font-medium">
                          {completedOrder.paymentStatus === 'paid' ? 'Pagada' : completedOrder.paymentStatus === 'partial' ? 'Parcial' : 'Pendiente'}
                        </span>
                      </div>

                      {/* Summary rows */}
                      <div className="rounded-xl bg-surface-2 p-3.5 space-y-2">
                        <div className="flex justify-between text-sm text-maison-cream-muted">
                          <span>Subtotal bruto</span>
                          <span className="font-mono">{formatCurrency(completedOrder.subtotal)}</span>
                        </div>
                        {completedOrder.discount && (
                          <div className="flex justify-between text-sm text-maison-amber font-medium">
                            <span>Descuento ({completedOrder.discount.name})</span>
                            <span className="font-mono">-{formatCurrency(completedOrder.discountAmount || 0)}</span>
                          </div>
                        )}
                        {completedOrder.taxableSubtotal !== null && completedOrder.taxableSubtotal !== undefined && (
                          <div className="flex justify-between text-xs text-maison-cream-dim border-t border-maison-border/40 pt-1.5">
                            <span>Base gravable</span>
                            <span className="font-mono">{formatCurrency(completedOrder.taxableSubtotal)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm text-maison-cream-muted">
                          <span>IVA {Math.round(completedOrder.taxRate * 100)}%</span>
                          <span className="font-mono">{formatCurrency(completedOrder.tax)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold text-maison-cream border-t border-maison-border pt-2 mt-1">
                          <span>Total</span>
                          <span className="font-mono text-maison-amber text-lg">{formatCurrency(completedOrder.total)}</span>
                        </div>
                        {alreadyPaid > 0 && (
                          <div className="flex justify-between text-sm text-maison-sage">
                            <span>Ya pagado</span>
                            <span className="font-mono">-{formatCurrency(alreadyPaid)}</span>
                          </div>
                        )}
                      </div>

                      {/* Discount selector */}
                      {completedOrder.paymentStatus === 'unpaid' && (
                        <div className="rounded-xl border border-maison-border bg-surface-2 p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-maison-cream-dim uppercase tracking-widest">Descuento de la orden</p>
                            {completedOrder.discount && (
                              <span className="text-[10px] font-semibold text-maison-amber bg-maison-amber/10 border border-maison-amber/30 rounded-full px-2 py-0.5">
                                Aplicado: {completedOrder.discount.name}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <select
                              value={selectedDiscountId || completedOrder.discountId || ''}
                              onChange={(e) => setSelectedDiscountId(e.target.value)}
                              className="flex-1 rounded-lg border border-maison-border bg-surface-1 px-3 py-2 text-xs text-maison-cream focus:outline-none focus:border-maison-amber"
                            >
                              <option value="">-- Seleccionar descuento --</option>
                              {availableDiscounts.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name} ({d.type === 'PERCENTAGE' ? `${d.value}%` : formatCurrency(d.value)})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                const idToApply = selectedDiscountId || completedOrder.discountId;
                                if (idToApply) {
                                  applyDiscount(idToApply);
                                }
                              }}
                              disabled={isSubmitting || (!selectedDiscountId && !completedOrder.discountId) || (selectedDiscountId === completedOrder.discountId && !!completedOrder.discountId)}
                              className="rounded-lg bg-maison-amber text-surface-0 px-3 py-2 text-xs font-semibold hover:bg-maison-amber/90 disabled:opacity-40 transition"
                            >
                              Aplicar
                            </button>
                            {completedOrder.discountId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDiscountId('');
                                  removeDiscount();
                                }}
                                disabled={isSubmitting}
                                className="rounded-lg border border-maison-ruby/40 text-maison-ruby px-3 py-2 text-xs font-semibold hover:bg-maison-ruby/10 disabled:opacity-40 transition"
                              >
                                Quitar
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Split payment */}
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-maison-cream-dim uppercase tracking-widest">Dividir pago</p>

                        {paymentLines.map((line, index) => (
                          <div key={line.id} className="rounded-xl border border-maison-border bg-surface-2 p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-maison-cream">
                                {METHOD_ICON[line.method] || '💰'} Pago {index + 1}
                              </span>
                              {paymentLines.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removePaymentLine(line.id)}
                                  className="flex items-center gap-1 text-[10px] text-maison-ruby hover:text-maison-ruby/80 transition"
                                >
                                  <IconTrash className="h-3 w-3" />
                                  Eliminar
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <select
                                value={line.method}
                                onChange={(e) => updatePaymentLine(line.id, { method: e.target.value as PaymentMethod })}
                                className="rounded-lg border border-maison-border bg-surface-1 px-2 py-2 text-xs text-maison-cream focus:outline-none focus:border-maison-amber col-span-1"
                              >
                                <option value="cash">💵 Efectivo</option>
                                <option value="card">💳 Tarjeta</option>
                                <option value="transfer">🏦 Transferencia</option>
                                <option value="qr">📱 QR</option>
                              </select>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.amount || ''}
                                placeholder="Monto"
                                onChange={(e) => updatePaymentLine(line.id, { amount: parseFloat(e.target.value) || 0 })}
                                className="rounded-lg border border-maison-border bg-surface-1 px-2 py-2 text-xs text-maison-cream placeholder:text-maison-cream-dim focus:outline-none focus:border-maison-amber font-mono col-span-1"
                              />
                              <input
                                type="text"
                                value={line.reference}
                                placeholder="Ref (opc.)"
                                onChange={(e) => updatePaymentLine(line.id, { reference: e.target.value })}
                                className="rounded-lg border border-maison-border bg-surface-1 px-2 py-2 text-xs text-maison-cream placeholder:text-maison-cream-dim focus:outline-none focus:border-maison-amber col-span-1"
                              />
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={addPaymentLine}
                          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-maison-border py-2.5 text-xs font-semibold text-maison-cream-dim hover:text-maison-amber hover:border-maison-amber/40 transition"
                        >
                          <IconPlus className="h-3.5 w-3.5" />
                          Agregar método de pago
                        </button>
                      </div>

                      {/* Payment status mini-cards */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-surface-2 border border-maison-border p-3 text-center">
                          <p className="text-[10px] font-medium text-maison-cream-dim uppercase tracking-wider mb-1">Pendiente</p>
                          <p className="font-mono text-sm font-bold text-maison-cream">{formatCurrency(remainingAmount)}</p>
                        </div>
                        <div className="rounded-xl bg-surface-2 border border-maison-border p-3 text-center">
                          <p className="text-[10px] font-medium text-maison-cream-dim uppercase tracking-wider mb-1">Capturado</p>
                          <p className="font-mono text-sm font-bold text-maison-amber">{formatCurrency(capturedTotal)}</p>
                        </div>
                        <div className={`rounded-xl border p-3 text-center ${capturedTotal <= remainingAmount + 0.01 ? 'bg-maison-sage/10 border-maison-sage/30' : 'bg-maison-ruby/10 border-maison-ruby/30'}`}>
                          <p className="text-[10px] font-medium text-maison-cream-dim uppercase tracking-wider mb-1">Restante</p>
                          <p className={`font-mono text-sm font-bold ${capturedTotal <= remainingAmount + 0.01 ? 'text-maison-sage' : 'text-maison-ruby'}`}>
                            {formatCurrency(Math.max(0, remainingAmount - capturedTotal))}
                          </p>
                        </div>
                      </div>

                      {/* Pay button */}
                      <button
                        type="button"
                        onClick={handlePayment}
                        disabled={!canPay}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-maison-sage text-surface-0 py-4 text-sm font-bold hover:bg-maison-sage/90 active:scale-[0.99] transition-all shadow-lg shadow-maison-sage/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                            Procesando…
                          </>
                        ) : (
                          <>
                            <IconCheck className="h-4 w-4" />
                            {capturedTotal >= remainingAmount - 0.01
                              ? `Cobrar ${formatCurrency(remainingAmount)}`
                              : `Cobrar ${formatCurrency(capturedTotal)} (parcial)`
                            }
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => { clearCart(); resetPaymentLines(); }}
                      className="w-full text-xs text-maison-cream-muted hover:text-maison-cream transition text-center py-1"
                    >
                      Cancelar y nueva orden
                    </button>
                  </>
                )
              ) : (
                /* Confirm order form */
                <div className="rounded-2xl border border-maison-border bg-surface-1 p-5 space-y-4">
                  <h2 className="text-base font-bold text-maison-cream">Confirmar orden</h2>

                  <div>
                    <label className="text-xs font-bold text-maison-cream-dim uppercase tracking-widest block mb-2">
                      Nombre del cliente
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-xl border border-maison-border bg-surface-2 px-4 py-2.5 text-sm text-maison-cream focus:outline-none focus:border-maison-amber focus:ring-1 focus:ring-maison-amber/30 transition"
                      placeholder="Nombre para la orden"
                    />
                  </div>

                  <div className="rounded-xl bg-surface-2 p-3.5 space-y-2">
                    <div className="flex justify-between text-base font-bold text-maison-cream border-t border-maison-border pt-2 mt-1">
                      <span>Total</span>
                      <span className="font-mono text-maison-amber text-lg">{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting || !customerName.trim() || cart.length === 0}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-maison-amber text-surface-0 py-4 text-sm font-bold hover:bg-maison-amber/90 active:scale-[0.99] transition-all shadow-lg shadow-maison-amber/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        Enviando a cocina…
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        Enviar a cocina
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Cart sidebar ─────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 border-l border-maison-border bg-surface-1 flex-col hidden lg:flex">
          {/* Sidebar header */}
          <div className="px-4 py-3.5 border-b border-maison-border bg-surface-2">
            <h3 className="text-sm font-bold text-maison-cream flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4 text-maison-amber" aria-hidden="true">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.57l1.65-7.43H6" />
                </svg>
                Carrito
              </span>
              {selectedTable && (
                <span className="text-[10px] font-medium text-maison-amber bg-maison-amber/10 border border-maison-amber/30 rounded-full px-2 py-0.5">
                  {selectedTable.name}
                </span>
              )}
            </h3>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-maison-cream-dim opacity-40" aria-hidden="true">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.57l1.65-7.43H6" />
                </svg>
                <p className="text-xs text-maison-cream-dim">Agrega items desde la carta</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.menuItem.id}
                  className="group flex items-center gap-2 rounded-xl bg-surface-2 border border-maison-border/50 px-3 py-2.5 hover:border-maison-border transition"
                >
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-maison-amber/10 font-mono text-xs font-bold text-maison-amber">
                    {item.quantity}
                  </span>
                  <span className="flex-1 text-xs font-medium text-maison-cream truncate">{item.menuItem.name}</span>
                  <span className="font-mono text-xs text-maison-cream-muted flex-shrink-0">{formatCurrency(item.menuItem.price * item.quantity)}</span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.menuItem.id)}
                    className="text-maison-cream-dim hover:text-maison-ruby transition opacity-0 group-hover:opacity-100 flex-shrink-0"
                    aria-label="Quitar"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-maison-border space-y-3 bg-surface-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-maison-cream-muted">Total</span>
              <span className="font-mono text-lg font-bold text-maison-amber">{formatCurrency(cartTotal)}</span>
            </div>
            <button
              type="button"
              onClick={() => { if (cart.length > 0) setView('payment'); }}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-maison-amber text-surface-0 py-3 text-sm font-bold hover:bg-maison-amber/90 transition shadow-lg shadow-maison-amber/20 disabled:opacity-40 disabled:shadow-none"
            >
              <IconPayment className="h-4 w-4" />
              Cobrar
            </button>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-maison-cream-muted hover:text-maison-ruby transition"
              >
                <IconTrash className="h-3 w-3" />
                Limpiar carrito
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
