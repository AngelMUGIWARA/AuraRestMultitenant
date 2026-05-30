export type OrderStatus = 'pending'|'confirmed'|'preparing'|'ready'|'delivered'|'cancelled';
export type PaymentStatus = 'pending'|'paid'|'refunded'|'failed';
export type OrderType = 'dine_in'|'takeaway'|'delivery';
export interface OrderItem { id: string; menuItemId: string; name: string; quantity: number; unitPrice: number; totalPrice: number; notes?: string; }
export interface Order {
  id: string; orderNumber: string; status: OrderStatus; paymentStatus: PaymentStatus;
  type: OrderType; items: OrderItem[]; itemCount: number; subtotal: number; tax: number;
  total: number; customerName: string; tableNumber?: string; deliveryAddress?: string;
  notes?: string; branchId: string; createdAt: string; updatedAt: string;
}
export interface OrderStats {
  totalToday: number; pendingOrders: number; preparingOrders: number; readyOrders: number;
  completedToday: number; cancelledToday: number; revenueToday: number; avgOrderValue: number;
}
export interface OrderFilters { status?: OrderStatus; type?: OrderType; paymentStatus?: PaymentStatus; branchId?: string; search?: string; date?: string; page?: number; limit?: number; }
export interface UpdateOrderStatusPayload { status: OrderStatus; notes?: string; }
