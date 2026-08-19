import { useState, useEffect, useCallback, useRef } from 'react';
import { on, emit } from '@maison/event-bus';
import { cashierService } from '../services/cashier.service';
import type { MenuItem, RestaurantTable, Order, PaymentMethod, Discount } from '@maison/types';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

const TABLE_POLL_MS = 15_000;

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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async (bId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [menuRes, tablesRes] = await Promise.all([
        cashierService.getMenuItems({ branchId: bId }),
        cashierService.getTables(bId),
      ]);
      setMenuItems(menuRes);
      setTables(tablesRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTables = useCallback(async (bId?: string) => {
    try {
      const tablesRes = await cashierService.getTables(bId);
      setTables(tablesRes);
    } catch {
      // Silent fail for polling
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

  // Auto-poll tables
  useEffect(() => {
    pollRef.current = setInterval(() => fetchTables(branchId), TABLE_POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchTables, branchId]);

  useEffect(() => {
    if (completedOrder?.id && (completedOrder.paymentStatus as string) === 'unpaid') {
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
        branchId,
      });
      setCompletedOrder(order);
      emit('order:created', { order });
      setCart([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear la orden');
    } finally {
      setIsSubmitting(false);
    }
  }, [cart, selectedTable, branchId]);

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
    fetchTables(branchId);
  }, [fetchTables, branchId]);

  const printTicket = useCallback(async (orderId: string) => {
    try {
      const updatedOrder = await cashierService.printTicket(orderId);
      setCompletedOrder(updatedOrder);
      await fetchTables(branchId);
      emit('order:updated', { orderId });
      return updatedOrder;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al imprimir ticket');
      return null;
    }
  }, [fetchTables, branchId]);

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
    applyDiscount, removeDiscount, refreshTables, printTicket, newOrder,
  };
}
