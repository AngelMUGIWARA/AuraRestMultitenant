export const TENANT_SLUG = 'test-tenant';
export const TENANT_SCHEMA = 'test_tenant_schema';

export const OWNER_USER_ID = 'user-owner-001';
export const ADMIN_USER_ID = 'user-admin-001';
export const WAITER_USER_ID = 'user-waiter-001';
export const CHEF_USER_ID = 'user-chef-001';
export const CASHIER_USER_ID = 'user-cashier-001';
export const INACTIVE_USER_ID = 'user-inactive-001';

import * as bcrypt from 'bcrypt';

let _hashCache: string | null = null;

export async function getActivePasswordHash(): Promise<string> {
  if (!_hashCache) {
    _hashCache = await bcrypt.hash(ACTIVE_PASSWORD, 10);
  }
  return _hashCache;
}

export const ACTIVE_PASSWORD_HASH =
  '$2b$10$gyexhOEEEx3Jq6NyRxD3uePE4MfyHCDFIPoBojEjoScAffoRpgni.';
export const ACTIVE_PASSWORD = 'TestPass123';

export const BRANCH_ID = 'branch-001';
export const TABLE_ID = 'table-001';
export const MENU_ITEM_ID = 'menu-item-001';
export const MENU_ITEM_ID_2 = 'menu-item-002';
export const ORDER_ID = 'order-001';
export const PAYMENT_ID = 'payment-001';
export const TICKET_ID = 'ticket-001';
export const ACTIVITY_LOG_ID = 'log-001';
export const IDEMPOTENCY_KEY = 'idem-test-key-001';

export const mockTenant = {
  id: 'tenant-001',
  name: 'Test Restaurant',
  slug: TENANT_SLUG,
  schemaName: TENANT_SCHEMA,
  email: 'admin@test.com',
  phone: '555-0000',
  address: '123 Test St',
  logoUrl: null,
  status: 'ACTIVE',
  plan: 'PRO',
};

export const mockOwnerUser = {
  id: OWNER_USER_ID,
  name: 'Owner User',
  email: 'owner@test.com',
  passwordHash: ACTIVE_PASSWORD_HASH,
  role: 'OWNER',
  status: 'ACTIVE',
  branchId: BRANCH_ID,
};

export const mockAdminUser = {
  id: ADMIN_USER_ID,
  name: 'Admin User',
  email: 'admin@test.com',
  passwordHash: ACTIVE_PASSWORD_HASH,
  role: 'ADMIN',
  status: 'ACTIVE',
  branchId: BRANCH_ID,
};

export const mockWaiterUser = {
  id: WAITER_USER_ID,
  name: 'Waiter User',
  email: 'waiter@test.com',
  passwordHash: ACTIVE_PASSWORD_HASH,
  role: 'WAITER',
  status: 'ACTIVE',
  branchId: BRANCH_ID,
};

export const mockChefUser = {
  id: CHEF_USER_ID,
  name: 'Chef User',
  email: 'chef@test.com',
  passwordHash: ACTIVE_PASSWORD_HASH,
  role: 'CHEF',
  status: 'ACTIVE',
  branchId: BRANCH_ID,
};

export const mockCashierUser = {
  id: CASHIER_USER_ID,
  name: 'Cashier User',
  email: 'cashier@test.com',
  passwordHash: ACTIVE_PASSWORD_HASH,
  role: 'CASHIER',
  status: 'ACTIVE',
  branchId: BRANCH_ID,
};

export const mockInactiveUser = {
  id: INACTIVE_USER_ID,
  name: 'Inactive User',
  email: 'inactive@test.com',
  passwordHash: ACTIVE_PASSWORD_HASH,
  role: 'WAITER',
  status: 'INACTIVE',
  branchId: BRANCH_ID,
};

export const mockMenuItem = {
  id: MENU_ITEM_ID,
  name: 'Tacos al Pastor',
  price: 85.0,
  status: 'ACTIVE',
  categoryId: 'cat-001',
};

export const mockMenuItem2 = {
  id: MENU_ITEM_ID_2,
  name: 'Hamburguesa',
  price: 120.0,
  status: 'ACTIVE',
  categoryId: 'cat-001',
};

export const mockTable = {
  id: TABLE_ID,
  number: 5,
  status: 'AVAILABLE',
  capacity: 4,
  branchId: BRANCH_ID,
};

export const mockCreatedOrder = {
  id: ORDER_ID,
  folio: '20260710-0001',
  type: 'DINE_IN',
  status: 'PENDING',
  customerName: 'Test Customer',
  notes: null,
  subtotal: '85.00',
  tax: '12.75',
  total: '97.75',
  version: 1,
  tableId: TABLE_ID,
  userId: OWNER_USER_ID,
  createdAt: new Date('2026-07-10T10:00:00Z'),
  updatedAt: new Date('2026-07-10T10:00:00Z'),
  orderItems: [
    {
      id: 'oi-001',
      menuItemId: MENU_ITEM_ID,
      quantity: 1,
      unitPrice: 85.0,
      subtotal: '85.00',
      notes: null,
      menuItem: { name: 'Tacos al Pastor' },
    },
  ],
  table: { ...mockTable },
  user: { id: OWNER_USER_ID, name: 'Owner User', email: 'owner@test.com' },
  payments: [],
};

export const mockConfirmedOrder = {
  ...mockCreatedOrder,
  status: 'CONFIRMED',
  version: 2,
};

export const mockPaidOrder = {
  ...mockCreatedOrder,
  status: 'PAID',
  paymentStatus: 'PAID',
  version: 3,
  payments: [
    {
      id: PAYMENT_ID,
      orderId: ORDER_ID,
      amount: 97.75,
      method: 'CASH',
      status: 'COMPLETED',
      reference: null,
      tip: null,
      createdAt: new Date('2026-07-10T10:05:00Z'),
    },
  ],
};

export const mockPartiallyPaidOrder = {
  ...mockCreatedOrder,
  paymentStatus: 'PARTIALLY_PAID',
  version: 2,
  payments: [
    {
      id: 'pay-partial-001',
      orderId: ORDER_ID,
      amount: 50.00,
      method: 'CASH',
      status: 'COMPLETED',
      reference: null,
      tip: null,
      createdAt: new Date('2026-07-10T10:03:00Z'),
    },
  ],
};

export const mockCancelledOrder = {
  ...mockCreatedOrder,
  status: 'CANCELLED',
  version: 2,
};

export const mockKitchenTicket = {
  id: TICKET_ID,
  orderId: ORDER_ID,
  status: 'PENDING',
  priority: 0,
  startedAt: null,
  completedAt: null,
  createdAt: new Date('2026-07-10T10:00:00Z'),
  updatedAt: new Date('2026-07-10T10:00:00Z'),
  order: {
    ...mockCreatedOrder,
    orderItems: mockCreatedOrder.orderItems,
  },
};

export const mockInProgressTicket = {
  ...mockKitchenTicket,
  status: 'IN_PROGRESS',
  startedAt: new Date('2026-07-10T10:01:00Z'),
};

export const mockActivityLogEntry = {
  id: ACTIVITY_LOG_ID,
  branchId: BRANCH_ID,
  userId: OWNER_USER_ID,
  action: 'ORDER_CREATED',
  entity: 'ORDER',
  entityId: ORDER_ID,
  changes: '{"folio":"20260710-0001","total":"97.75"}',
  createdAt: new Date('2026-07-10T10:00:00Z'),
  branch: { id: BRANCH_ID, name: 'Main Branch' },
  user: { id: OWNER_USER_ID, name: 'Owner User' },
};

export const RESERVATION_ID = 'res-001';

export const mockReservation = {
  id: RESERVATION_ID,
  branchId: BRANCH_ID,
  tableId: TABLE_ID,
  userId: OWNER_USER_ID,
  guestName: 'Juan Pérez',
  guestPhone: '555-1234567',
  guestEmail: 'juan@test.com',
  partySize: 4,
  scheduledAt: new Date('2026-07-21T19:00:00Z'),
  status: 'CONFIRMED',
  notes: 'Mesa junto a la ventana',
  createdAt: new Date('2026-07-20T10:00:00Z'),
  updatedAt: new Date('2026-07-20T10:00:00Z'),
};

export const mockReservation2 = {
  id: 'res-002',
  branchId: BRANCH_ID,
  tableId: TABLE_ID,
  userId: OWNER_USER_ID,
  guestName: 'María López',
  guestPhone: '555-9876543',
  guestEmail: 'maria@test.com',
  partySize: 2,
  scheduledAt: new Date('2026-07-21T20:00:00Z'),
  status: 'PENDING',
  notes: null,
  createdAt: new Date('2026-07-20T11:00:00Z'),
  updatedAt: new Date('2026-07-20T11:00:00Z'),
};

export const mockPaymentRecord = {
  id: PAYMENT_ID,
  orderId: ORDER_ID,
  amount: 97.75,
  method: 'CASH',
  status: 'COMPLETED',
  reference: null,
  tip: null,
  idempotencyKey: IDEMPOTENCY_KEY,
  processedAt: new Date('2026-07-10T10:05:00Z'),
  createdAt: new Date('2026-07-10T10:05:00Z'),
};
