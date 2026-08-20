import { useEffect, useState } from 'react';
import { Modal } from '@maison/ui';
import type { MenuItem, Order } from '@maison/types';
import { ordersService } from '../services/orders.service';
import { formatCurrency, cn } from '../utils';

interface CartLine {
    menuItem: MenuItem;
    quantity: number;
}

interface AddItemsModalProps {
    order: Order | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddItemsModal({ order, onClose, onSuccess }: AddItemsModalProps) {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [isLoadingMenu, setIsLoadingMenu] = useState(true);
    const [cart, setCart] = useState<CartLine[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const open = order !== null;

    useEffect(() => {
        if (!open) return;
        setCart([]);
        setError(null);
        setIsLoadingMenu(true);
        ordersService.getMenuItems()
            .then((items) => setMenuItems(items))
            .catch(() => setError('No se pudo cargar el menú'))
            .finally(() => setIsLoadingMenu(false));
    }, [open]);

    function addToCart(item: MenuItem) {
        setCart((prev) => {
            const existing = prev.find((c) => c.menuItem.id === item.id);
            if (existing) {
                return prev.map((c) => (c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
            }
            return [...prev, { menuItem: item, quantity: 1 }];
        });
    }

    function updateQuantity(menuItemId: string, quantity: number) {
        if (quantity <= 0) {
            setCart((prev) => prev.filter((c) => c.menuItem.id !== menuItemId));
            return;
        }
        setCart((prev) => prev.map((c) => (c.menuItem.id === menuItemId ? { ...c, quantity } : c)));
    }

    const cartTotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);

    async function handleSubmit() {
        if (!order || cart.length === 0) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await ordersService.addItems(
                order.id,
                cart.map((c) => ({ menuItemId: c.menuItem.id, quantity: c.quantity })),
            );
            onSuccess();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'No se pudieron agregar los items');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Modal open={open} onClose={onClose} title={order ? `Agregar items a #${order.orderNumber}` : ''} size="lg">
            <div className="flex flex-col gap-4">
                {error && (
                    <p role="alert" className="rounded border border-maison-ruby/40 bg-maison-ruby-bg px-3 py-2 text-xs text-maison-ruby">
                        {error}
                    </p>
                )}

                {isLoadingMenu ? (
                    <p className="py-8 text-center text-sm text-maison-cream-dim">Cargando menú…</p>
                ) : (
                    <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => addToCart(item)}
                                className="flex items-center justify-between gap-2 rounded-lg border border-maison-border bg-surface-2 px-3 py-2 text-left transition-colors hover:border-maison-amber/40 hover:bg-surface-3"
                            >
                                <span className="truncate text-sm text-maison-cream">{item.name}</span>
                                <span className="flex-shrink-0 font-mono text-xs text-maison-cream-dim">{formatCurrency(item.price)}</span>
                            </button>
                        ))}
                        {menuItems.length === 0 && (
                            <p className="col-span-2 py-6 text-center text-sm text-maison-cream-dim">No hay platillos disponibles.</p>
                        )}
                    </div>
                )}

                {cart.length > 0 && (
                    <div className="flex flex-col gap-2 border-t border-maison-border pt-3">
                        <p className="text-2xs font-semibold uppercase tracking-widest text-maison-cream-dim">Items a agregar</p>
                        {cart.map((c) => (
                            <div key={c.menuItem.id} className="flex items-center justify-between gap-3">
                                <span className="min-w-0 flex-1 truncate text-sm text-maison-cream">{c.menuItem.name}</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => updateQuantity(c.menuItem.id, c.quantity - 1)}
                                        className="flex h-6 w-6 items-center justify-center rounded border border-maison-border text-maison-cream-muted hover:bg-surface-3"
                                        aria-label={`Quitar una unidad de ${c.menuItem.name}`}
                                    >
                                        −
                                    </button>
                                    <span className="w-5 text-center font-mono text-sm tabular-nums text-maison-cream">{c.quantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => updateQuantity(c.menuItem.id, c.quantity + 1)}
                                        className="flex h-6 w-6 items-center justify-center rounded border border-maison-border text-maison-cream-muted hover:bg-surface-3"
                                        aria-label={`Agregar una unidad de ${c.menuItem.name}`}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="flex items-center justify-between border-t border-maison-border/60 pt-2 text-sm">
                            <span className="text-maison-cream-dim">Subtotal a agregar</span>
                            <span className="font-mono font-semibold text-maison-cream">{formatCurrency(cartTotal)}</span>
                        </div>
                    </div>
                )}

                <div className={cn('flex justify-end gap-2', cart.length === 0 && 'pt-1')}>
                    <button type="button" onClick={onClose} className="btn-ghost" disabled={isSubmitting}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={cart.length === 0 || isSubmitting}
                        className="btn-primary disabled:opacity-50"
                    >
                        {isSubmitting ? 'Agregando…' : 'Agregar al pedido'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
