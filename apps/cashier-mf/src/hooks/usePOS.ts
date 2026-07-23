import { useState, useEffect, useCallback } from 'react';
import { on, emit } from '@maison/event-bus';
import { cashierService } from '../services/cashier.service';
import type { MenuItem, RestaurantTable, Order, PaymentMethod, Discount } from '@maison/types';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export function usePOS() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);

  const loadData = useCallback(async (bId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [menuRes, tablesRes] = await Promise.all([
        cashierService.getMenuItems({ branchId: bId }),
        cashierService.getTables(),
      ]);
      setMenuItems(menuRes);
      setTables(tablesRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAvailableDiscounts = useCallback(async (orderId: string) => {
    try {
      const discounts = await cashierService.getAvailableDiscounts(orderId);
      setAvailableDiscounts(discounts);
    } catch {
      setAvailableDiscounts([]);
    }
  }, []);

  useEffect(() => {
    loadData(branchId);

    const offBranch = on('branch:changed', ({ branchId: id, isGlobal }) => {
      const newBranchId = isGlobal ? undefined : id;
      setBranchId(newBranchId);
      loadData(newBranchId);
      setCart([]);
      setSelectedTable(null);
    });

    const offMenuUpdated = on('menu:updated', () => loadData(branchId));

    return () => { offBranch(); offMenuUpdated(); };
  }, [loadData]);

  useEffect(() => {
    if (completedOrder?.id && completedOrder.paymentStatus === 'unpaid') {
      fetchAvailableDiscounts(completedOrder.id);
    } else {
      setAvailableDiscounts([]);
    }
  }, [completedOrder?.id, completedOrder?.paymentStatus, fetchAvailableDiscounts]);

  const addToCart = useCallback((item: MenuItem, quantity = 1, notes?: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + quantity } : c);
      }
      return [...prev, { menuItem: item, quantity, notes }];
    });
  }, []);

  const removeFromCart = useCallback((menuItemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItem.id !== menuItemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedTable(null);
    setCompletedOrder(null);
    setAvailableDiscounts([]);
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  const submitOrder = useCallback(async (customerName: string) => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const order = await cashierService.createOrder({
        type: selectedTable ? 'DINE_IN' : 'TAKEOUT',
        items: cart.map((c) => ({ menuItemId: c.menuItem.id, quantity: c.quantity, notes: c.notes })),
        customerName,
        tableId: selectedTable?.id,
      });
      setCompletedOrder(order);
      emit('order:created', { order });
      setCart([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear la orden');
    } finally {
      setIsSubmitting(false);
    }
  }, [cart, selectedTable]);

  const applyDiscount = useCallback(async (discountId: string) => {
    if (!completedOrder) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const updatedOrder = await cashierService.applyDiscount(completedOrder.id, discountId);
      setCompletedOrder(updatedOrder);
      await fetchAvailableDiscounts(completedOrder.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al aplicar el descuento');
    } finally {
      setIsSubmitting(false);
    }
  }, [completedOrder, fetchAvailableDiscounts]);

  const removeDiscount = useCallback(async () => {
    if (!completedOrder) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const updatedOrder = await cashierService.removeDiscount(completedOrder.id);
      setCompletedOrder(updatedOrder);
      await fetchAvailableDiscounts(completedOrder.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al retirar el descuento');
    } finally {
      setIsSubmitting(false);
    }
  }, [completedOrder, fetchAvailableDiscounts]);

  const refreshTables = useCallback(() => {
    loadData(branchId);
  }, [loadData, branchId]);

  const processPayment = useCallback(async (
    payments: Array<{ method: PaymentMethod; amount: number; reference?: string }>,
  ) => {
    if (!completedOrder) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);
      await cashierService.processPayment({
        orderId: completedOrder.id,
        payments: payments.map((p) => ({
          method: p.method.toUpperCase() as 'CASH' | 'CARD' | 'TRANSFER' | 'QR' | 'OTHER',
          amount: p.amount.toFixed(2),
          reference: p.reference || undefined,
        })),
      });

      const updatedOrder = await cashierService.getOrderById(completedOrder.id);
      setCompletedOrder(updatedOrder);

      emit('payment:completed', {
        orderId: completedOrder.id,
        orderNumber: completedOrder.orderNumber,
        methods: payments.map((p) => p.method),
        amount: totalPayment,
        paidAmount: updatedOrder.paidAmount,
        remainingAmount: updatedOrder.remainingAmount,
        isFullyPaid: updatedOrder.isFullyPaid,
      });

      if (updatedOrder.isFullyPaid) {
        refreshTables();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar el pago');
    } finally {
      setIsSubmitting(false);
    }
  }, [completedOrder, refreshTables]);

  const newOrder = useCallback(() => {
    clearCart();
  }, [clearCart]);

  return {
    menuItems, tables, cart, selectedTable, setSelectedTable,
    cartTotal,
    isLoading, isSubmitting, error, completedOrder, availableDiscounts,
    addToCart, removeFromCart, clearCart, submitOrder, processPayment,
    applyDiscount, removeDiscount, refreshTables, newOrder,
  };
}
