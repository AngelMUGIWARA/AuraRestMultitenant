import { useState, useCallback, useEffect } from 'react';
import { emit } from '@maison/event-bus';
import { useBranch } from '@maison/ui';
import { ordersService } from '../services/orders.service';
import type { MenuItem, RestaurantTable, CreateOrderPayload } from '@maison/types';

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

export function useCreateOrder(initialTableId?: string) {
  const { selectedBranch } = useBranch();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [table, setTable] = useState<RestaurantTable | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingMenu(true);
    ordersService.getMenuItems()
      .then((items) => { if (!cancelled) setMenuItems(items); })
      .catch(() => { if (!cancelled) setError('Error al cargar el menú'); })
      .finally(() => { if (!cancelled) setIsLoadingMenu(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!initialTableId) return;
    let cancelled = false;
    ordersService.getTable(initialTableId)
      .then((res) => {
        if (!cancelled) {
          const tableData = (res as any)?.data ?? res;
          if (tableData && tableData.id) {
            setTable(tableData);
          }
        }
      })
      .catch((err) => {
        console.error('Error al cargar la mesa:', err);
      });
    return () => { cancelled = true; };
  }, [initialTableId]);

  const addItem = useCallback((item: MenuItem, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === item.id ? { ...c, quantity: c.quantity + quantity } : c,
        );
      }
      return [...prev, { menuItem: item, quantity, notes: '' }];
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItem.id !== menuItemId));
  }, []);

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    if (quantity <= 0) return removeItem(menuItemId);
    setCart((prev) =>
      prev.map((c) => (c.menuItem.id === menuItemId ? { ...c, quantity } : c)),
    );
  }, [removeItem]);

  const updateNotes = useCallback((menuItemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((c) => (c.menuItem.id === menuItemId ? { ...c, notes } : c)),
    );
  }, []);

  const cartTotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);

  const submitOrder = useCallback(async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const order = await ordersService.createOrder({
        type: table ? 'DINE_IN' : 'TAKEOUT',
        items: cart.map((c) => ({ menuItemId: c.menuItem.id, quantity: c.quantity, notes: c.notes })),
        customerName: customerName || undefined,
        tableId: table?.id,
      });
      emit('order:created', { order });
      setCart([]);
      setCustomerName('');
      window.location.href = '/waiter/tables';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear la orden');
    } finally {
      setIsSubmitting(false);
    }
  }, [cart, table, customerName]);

  return {
    menuItems,
    table,
    setTable,
    cart,
    cartTotal,
    customerName,
    setCustomerName,
    addItem,
    removeItem,
    updateQuantity,
    updateNotes,
    submitOrder,
    isSubmitting,
    isLoadingMenu,
    error,
  };
}
