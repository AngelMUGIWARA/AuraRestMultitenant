// ─── Generic API wrappers ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

export type AsyncState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

// Coincide con el enum UserRole de apps/backend/prisma/tenant/schema.prisma,
// más SUPER_ADMIN (operador de plataforma, vive fuera de cualquier tenant —
// ver apps/backend/src/system-admin/).
export type UserRole =
  | "OWNER"
  | "MANAGER"
  | "WAITER"
  | "CASHIER"
  | "KITCHEN_STAFF"
  | "SUPER_ADMIN";

// Coincide con el enum UserStatus de apps/backend/prisma/tenant/schema.prisma.
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId?: string;
  tenantId?: string;
  avatarUrl?: string;
}

export const ROLE_ROUTES: Record<string, string> = {
  OWNER:         '/dashboard',
  SUPER_ADMIN:   '/admin/dashboard',
  MANAGER:       '/manager-dashboard',
  WAITER:        '/waiter/tables',
  CASHIER:       '/cashier',
  KITCHEN_STAFF: '/chef/dashboard',
};

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: string;
  tenantSlug: string;
  tenantSchemaName: string;
  branchId?: string;
  tenantId?: string;
  /** Solo presente en el access token (no en el refresh token). */
  mustChangePassword?: boolean;
  exp: number;
  iat: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ─── Tenant ───────────────────────────────────────────────────────────────────
//
// Coincide con el modelo Tenant real de
// apps/backend/prisma/system/schema.prisma. Gestionado exclusivamente por el
// Super Admin (apps/backend/src/system-admin/tenants/) — no por un tenant
// ADMIN/OWNER individual.

export type TenantStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type TenantPlan = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  schemaName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  status: TenantStatus;
  plan: TenantPlan;
  createdAt: string;
  updatedAt: string;
}

export interface TenantFilters {
  status?: TenantStatus;
  plan?: TenantPlan;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateTenantPayload {
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  plan?: TenantPlan;
  ownerName: string;
  ownerEmail: string;
}

export interface TenantOwnerCredentials {
  email: string;
  temporaryPassword: string;
}

export interface CreateTenantResponse {
  tenant: Tenant;
  owner: TenantOwnerCredentials;
}

export interface SuspendTenantPayload {
  reason?: string;
}

// ─── Super Admin ──────────────────────────────────────────────────────────────

export interface SuperAdmin {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN";
}

export interface SuperAdminLoginPayload {
  email: string;
  password: string;
}

export interface SuperAdminAuthResponse {
  accessToken: string;
  refreshToken: string;
  superAdmin: SuperAdmin;
}

export interface SystemAuditLogEntry {
  id: string;
  superAdminId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Branch / Sucursal ────────────────────────────────────────────────────────

export type BranchStatus = "active" | "inactive" | "maintenance";

export interface Branch {
  id: string;
  name: string;
  slug?: string;
  city: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: BranchStatus;
  isGlobal?: boolean;
  isActive?: boolean;
  openingHours?: string;
  capacity?: number;
  managerName?: string;
  tenantId?: string;
  avgRating?: number;
  ordersToday?: number;
  createdAt?: string;
}

export interface BranchStats {
  totalBranches: number;
  activeBranches: number;
  inactiveBranches: number;
  maintenanceBranches: number;
  totalCapacity: number;
  avgRating: number;
}

export interface BranchFilters {
  status?: BranchStatus;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// El backend (CreateBranchDto/UpdateBranchDto) solo persiste name/slug/
// address/phone — el resto de los campos de Branch (city, email, capacity,
// managerName, openingHours, status, avgRating) no existen todavía en el
// modelo Prisma. Se dejan aquí como opcionales para no romper el contrato
// de Branch, pero enviarlos al crear/editar no tiene efecto: el
// ValidationPipe global (forbidNonWhitelisted) los descartaría con un 400
// si no fueran opcionales y se incluyeran en el payload.
export interface CreateBranchPayload {
  name: string;
  slug?: string;
  address?: string;
  phone?: string;
  city?: string;
  email?: string;
  capacity?: number;
  managerName?: string;
  openingHours?: string;
  tableCount?: number;
  defaultCapacity?: number;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  branchId?: string;
  branchName?: string;
  tenantId?: string;
  tenantName?: string;
  avatarUrl?: string;
  phone?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingUsers: number;
  adminCount: number;
  managerCount: number;
  staffCount: number;
  newThisMonth: number;
}

export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  branchId?: string;
  tenantId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UpdateUserRolePayload {
  role: UserRole;
}
export interface InviteUserPayload {
  name: string;
  email: string;
  role: UserRole;
  branchId?: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  activeUsers: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  avgRating: number;
  newTenantsThisMonth: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  tenants: number;
}

export type ActivityEventType =
  | "tenant_created"
  | "user_registered"
  | "plan_upgraded"
  | "payment_received"
  | "tenant_suspended"
  | "menu_published";

export interface ActivityItem {
  id: string;
  type: ActivityEventType;
  title: string;
  description: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  metadata?: Record<string, string | number>;
}

// ─── Menu / Carta ─────────────────────────────────────────────────────────────

export type MenuItemStatus = "AVAILABLE" | "UNAVAILABLE" | "OUT_OF_STOCK";

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  status: MenuItemStatus;
  isAvailable: boolean;
  categoryId: string;
  category: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  /** Flattened convenience — set by transform layer if needed */
  categoryName?: string;
  originalPrice?: number;
  isPopular?: boolean;
  isFeatured?: boolean;
  preparationTime?: number;
  allergens?: string[];
  branchId?: string;
}

export interface MenuStats {
  totalItems: number;
  availableItems: number;
  unavailableItems: number;
  outOfStockItems: number;
  totalCategories: number;
  avgPrice: number;
  popularItems: number;
}

export interface MenuFilters {
  status?: MenuItemStatus;
  categoryId?: string;
  isPopular?: boolean;
  branchId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "name" | "price" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface CreateMenuItemPayload {
  name: string;
  description?: string;
  categoryId: string;
  price: number;
  file?: File;
  imageUrl?: string;
  isAvailable?: boolean;
}

export interface UpdateMenuItemPricePayload {
  price: number;
  reason?: string;
}

export interface UpdateMenuItemPayload {
  name?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  file?: File;
  imageUrl?: string;
  isAvailable?: boolean;
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  parentId?: string;
  parentName?: string;
  productCount: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  branchId?: string;
}

export interface CategoryStats {
  totalCategories: number;
  activeCategories: number;
  rootCategories: number;
  subCategories: number;
  avgProductsPerCategory: number;
  mostPopularCategory: string;
}

export interface CategoryFilters {
  isActive?: boolean;
  parentId?: string | null;
  search?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// ─── Inventory ────────────────────────────────────────────────────────────────
// Tipos alineados a la API real: /admin/inventory/* (backend NestJS).
// CHEF/KITCHEN_STAFF reciben los objetos SIN costPerUnit/supplier — por eso
// esos campos son opcionales.

export type InventoryUnit = "KG" | "G" | "L" | "ML" | "PIECE" | "PACKAGE" | "BOX";

export type InventoryMovementType =
  | "PURCHASE"
  | "CONSUMPTION"
  | "ADJUSTMENT"
  | "WASTE"
  | "TRANSFER_IN"
  | "TRANSFER_OUT";

export interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryStockEntry {
  id: string;
  itemId: string;
  branchId: string;
  quantity: string | number;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  unit: InventoryUnit;
  /** Ausente para CHEF/KITCHEN_STAFF */
  costPerUnit?: string | number;
  minStock: string | number;
  maxStock?: string | number | null;
  imageUrl?: string | null;
  isActive: boolean;
  /** Ausente para CHEF/KITCHEN_STAFF */
  supplierId?: string | null;
  /** Ausente para CHEF/KITCHEN_STAFF */
  supplier?: { id: string; name: string } | null;
  stocks: InventoryStockEntry[];
  totalStock?: number;
  belowMinimum?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryStockRow {
  id: string;
  itemId: string;
  branchId: string;
  quantity: string | number;
  belowMinimum: boolean;
  item: InventoryItem;
  branch: { id: string; name: string; slug: string };
  updatedAt: string;
}

export interface StockAlert {
  itemId: string;
  itemName: string;
  unit: InventoryUnit;
  branchId: string;
  branchName: string;
  quantity: number;
  minStock: number;
  deficit: number;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  branchId: string;
  type: InventoryMovementType;
  quantity: string | number;
  unitCost?: string | number | null;
  totalCost?: string | number | null;
  reason?: string | null;
  reference?: string | null;
  supplierId?: string | null;
  createdBy: string;
  createdAt: string;
  item?: { id: string; name: string; unit: InventoryUnit };
  branch?: { id: string; name: string; slug: string };
  supplier?: { id: string; name: string } | null;
  user?: { id: string; name: string; role: string };
}

export interface RecipeIngredientEntry {
  inventoryItemId: string;
  quantity: number;
  notes?: string | null;
  item: InventoryItem;
}

export interface MenuItemRecipe {
  menuItemId: string;
  menuItemName: string;
  ingredients: RecipeIngredientEntry[];
}

export interface MenuAvailability {
  menuItemId: string;
  name: string;
  available: boolean;
}

export interface CreateInventoryItemPayload {
  name: string;
  sku?: string;
  description?: string;
  unit: InventoryUnit;
  costPerUnit?: number;
  minStock?: number;
  maxStock?: number;
  supplierId?: string;
  isActive?: boolean;
}

export interface CreateSupplierPayload {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}

export interface CreateMovementPayload {
  itemId: string;
  branchId: string;
  type: InventoryMovementType;
  quantity: number;
  direction?: "IN" | "OUT";
  unitCost?: number;
  reason?: string;
  reference?: string;
  supplierId?: string;
}

export interface UpsertRecipePayload {
  ingredients: Array<{ inventoryItemId: string; quantity: number; notes?: string }>;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivered"
  | "paid"
  | "cancelled";
export type PaymentStatus = "pending" | "partial" | "paid" | "partially_refunded" | "refunded" | "failed";
export type OrderType = "dine_in" | "takeaway" | "delivery";

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  promotionId?: string | null;
  promotionNameSnapshot?: string | null;
  promotionTypeSnapshot?: string | null;
  promotionValueSnapshot?: number | null;
  promotionQuantity?: number | null;
  promotionAmount?: number | null;
  originalUnitPrice?: number | null;
  effectiveUnitPrice?: number | null;
  notes?: string;
}

// ─── Discount & Promotion ───────────────────────────────────────────────────

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Discount {
  id: string;
  name: string;
  description?: string | null;
  code?: string | null;
  type: DiscountType;
  value: number;
  isActive: boolean;
  branchId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  minPurchase?: number | null;
  maxAmount?: number | null;
  createdAt: string;
  updatedAt: string;
}

export type PromotionType =
  | 'PERCENTAGE_DISCOUNT'
  | 'FIXED_DISCOUNT'
  | 'BUY_X_GET_Y'
  | 'FREE_ITEM'
  | 'SPECIAL_PRICE'
  | 'CATEGORY_PERCENTAGE'
  | 'CATEGORY_FIXED';

export interface Promotion {
  id: string;
  name: string;
  description?: string | null;
  type: PromotionType;
  value: number;
  minPurchase?: number | null;
  maxAmount?: number | null;
  specialPrice?: number | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  startMinute?: number | null;
  endMinute?: number | null;
  priority: number;
  isActive: boolean;
  branchId?: string | null;
  categoryIds?: string[];
  itemIds?: string[];
  targetItemIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderPromotion {
  id: string;
  promotionId: string;
  name: string;
  type: string;
  value: number;
  promotionAmount: number;
}

export interface ApplyDiscountPayload {
  discountId: string;
}

export interface CreateDiscountPayload {
  name: string;
  type: DiscountType;
  value: string;
  isActive?: boolean;
  branchId?: string;
  startsAt?: string;
  endsAt?: string;
  minPurchase?: string;
  maxAmount?: string;
  description?: string;
  code?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  type: OrderType;
  items: OrderItem[];
  itemCount: number;
  subtotal: number;
  promotionAmount?: number | null;
  promotedSubtotal?: number | null;
  discountId?: string | null;
  discountAmount?: number | null;
  taxableSubtotal?: number | null;
  appliedPromotions?: OrderPromotion[];
  discount?: {
    id: string;
    name: string;
    type: DiscountType;
    value: number;
  } | null;
  tax: number;
  taxRate: number;
  totalBeforeTip: number;
  tipAmount: number;
  cashTipAmount: number;
  chargeableTipAmount: number;
  total: number;
  amountDueForPayments: number;
  paidAmount: number;
  remainingAmount: number;
  isFullyPaid: boolean;
  completedPaidAmount?: number;
  completedRefundAmount?: number;
  netPaidAmount?: number;
  tip?: {
    method: 'NONE' | 'PERCENTAGE' | 'FIXED' | 'CASH';
    percentage?: number | null;
    requestedAmount?: number | null;
  } | null;
  paymentMethods: PaymentMethod[];
  customerName: string;
  waiterName?: string;
  waiterId?: string | null;
  ticketPrinted?: boolean;
  tableNumber?: string;
  deliveryAddress?: string;
  notes?: string;
  branchId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStats {
  totalToday: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
  completedToday: number;
  cancelledToday: number;
  revenueToday: number;
  avgOrderValue: number;
}

export interface OrderFilters {
  status?: OrderStatus;
  type?: OrderType;
  paymentStatus?: PaymentStatus;
  branchId?: string;
  search?: string;
  date?: string;
  page?: number;
  limit?: number;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  notes?: string;
}

export interface CreateOrderPayload {
  type: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
  customerName?: string;
  tableId?: string;
  notes?: string;
}

// ─── Kitchen ──────────────────────────────────────────────────────────────────

// ─── Payment ──────────────────────────────────────────────────────────────────

export type PaymentMethod = "cash" | "card" | "qr" | "transfer";

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  status: string;
  reference?: string | null;
  tipAmount?: number | null;
  createdAt: string;
}

export interface ProcessPaymentPayload {
  orderId: string;
  payments: Array<{
    method: 'CASH' | 'CARD' | 'TRANSFER' | 'QR' | 'OTHER';
    amount: string;
    reference?: string;
  }>;
}

// ─── Reservation ──────────────────────────────────────────────────────────────

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ARRIVED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Reservation {
  id: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  partySize: number;
  date: string;
  time: string;
  durationMinutes: number;
  status: ReservationStatus;
  tableId: string;
  branchId: string;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ReservationStats {
  totalToday: number;
  confirmedToday: number;
  pendingConfirmation: number;
  arrivedToday: number;
  completedToday: number;
  cancelledToday: number;
  noShowToday: number;
  averagePartySize: number;
  occupancyRate: number;
}

export interface ReservationFilters {
  status?: ReservationStatus;
  date?: string;
  branchId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateReservationPayload {
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  partySize: number;
  date: string;
  time: string;
  durationMinutes?: number;
  notes?: string;
  branchId: string;
  tableId: string;
}


// ─── Table ────────────────────────────────────────────────────────────────────

export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";

export interface RestaurantTable {
  id: string;
  number: number;
  name?: string | null;
  capacity: number;
  status: TableStatus;
  locationZone?: string | null;
  isActive: boolean;
  branchId: string;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  activeOrder?: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: number;
    itemCount: number;
    waiterName?: string | null;
    waiterId?: string | null;
    ticketPrinted: boolean;
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
    }>;
  } | null;
}

export interface CreateTablePayload {
  number: number;
  name?: string;
  capacity: number;
  locationZone?: string;
  branchId: string;
}

export interface UpdateTableStatusPayload {
  status: TableStatus;
  notes?: string; // Opcional, por si quieres registrar por qué cambió
}

export interface TableFilters {
  page?: number;
  limit?: number;
  branchId?: string;
  status?: TableStatus;
  search?: string;
}

// ─── Voice / Alexa ────────────────────────────────────────────────────────────

export interface VoiceSeedPayload {
  voiceUsername: string;
}

export interface VoiceSeedResponse {
  voiceUsername: string;
}

export interface VoiceSeedGenerateResponse {
  seedWord: string;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface SalesSummary {
  totalOrders: number;
  totalSubtotal: number;
  totalTax: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export interface DailySale {
  date: string;
  orders: number;
  revenue: number;
}

export interface SalesReport {
  startDate: string;
  endDate: string;
  summary: SalesSummary;
  dailySales: DailySale[];
}

export interface TopProduct {
  menuItemId: string;
  name: string;
  category: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface ProductsReport {
  startDate: string;
  endDate: string;
  topProducts: TopProduct[];
}

export interface PaymentByMethod {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface PaymentsReport {
  startDate: string;
  endDate: string;
  totalPayments: number;
  totalRevenue: number;
  byMethod: PaymentByMethod[];
}

export interface PeakHour {
  hour: number;
  label: string;
  orders: number;
  revenue: number;
}

export interface PeakHoursReport {
  startDate: string;
  endDate: string;
  totalOrders: number;
  byHour: PeakHour[];
}

// ─── Refunds ──────────────────────────────────────────────────────────────────

export type RefundStatus = "pending" | "completed" | "failed" | "cancelled";

export interface Refund {
  id: string;
  paymentId: string;
  orderId: string;
  amount: number;
  reason?: string | null;
  status: RefundStatus;
  idempotencyKey: string;
  requestedBy?: string | null;
  createdBy?: string | null;
  createdAt: string;
  completedAt?: string | null;
  failedAt?: string | null;
}

// ─── Receipts ────────────────────────────────────────────────────────────────

export interface ReceiptSnapshot {
  receipt: {
    folio: string;
    issuedAt: string;
  };
  restaurant: {
    name: string;
    branchName: string | null;
    address: string | null;
  };
  order: {
    id: string;
    folio: string;
    customerName: string | null;
    createdAt: string;
    paidAt: string | null;
  };
  table: {
    number: string | null;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
    notes: string | null;
  }>;
  totals: {
    grossSubtotal: string;
    promotionAmount: string;
    promotedSubtotal: string;
    manualDiscountAmount: string;
    taxableSubtotal: string;
    taxAmount: string;
    tipAmount: string;
    amountDueForPayments: string;
    total: string;
  };
  payments: Array<{
    id: string;
    method: string;
    amount: string;
    status: string;
    paidAt: string | null;
  }>;
  refunds: Array<{
    id: string;
    amount: string;
    status: string;
    createdAt: string;
  }>;
}

export interface Receipt {
  id: string;
  orderId: string;
  folio: string;
  branchId?: string | null;
  userId: string | null;
  subtotal: string;
  promotionAmount: string;
  discountAmount: string;
  taxAmount: string;
  tipAmount: string;
  total: string;
  snapshot: ReceiptSnapshot;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReceiptPayload {
  orderId: string;
  idempotencyKey: string;
}

// ── Kitchen Display Engine ──────────────────────────────────

export type KitchenTicketStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type KitchenItemStatus = 'PENDING' | 'PREPARING' | 'READY' | 'CANCELLED';
export type KitchenPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface KitchenTicketItem {
  id: string;
  orderItemId: string;
  menuItemName: string;
  quantity: number;
  notes: string | null;
  status: KitchenItemStatus;
  version: number;
  startedAt: string | null;
  readyAt: string | null;
}

export interface KitchenTicket {
  id: string;
  orderId: string;
  orderNumber: string | null;
  branchId: string | null;
  status: KitchenTicketStatus;
  priority: KitchenPriority;
  version: number;
  items: KitchenTicketItem[];
  customerName: string | null;
  tableNumber: string | null;
  notes: string | null;
  startedAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKitchenTicketPayload {
  orderId: string;
  priority?: KitchenPriority;
}

export interface UpdateKitchenItemStatusPayload {
  status: KitchenItemStatus;
  version: number;
  reason?: string;
}

// ─── Cash Register Engine Types ──────────────────────────────────────────────

export type CashRegisterStatus = 'ACTIVE' | 'INACTIVE';
export type CashSessionStatus = 'OPEN' | 'CLOSED';
export type CashMovementType =
  | 'OPENING_FLOAT'
  | 'CASH_PAYMENT'
  | 'CASH_REFUND'
  | 'CASH_IN'
  | 'CASH_OUT'
  | 'ADJUSTMENT';

export interface CashRegisterEntity {
  id: string;
  branchId: string;
  name: string;
  status: CashRegisterStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CashSessionEntity {
  id: string;
  registerId: string;
  openedBy: string;
  closedBy: string | null;
  status: CashSessionStatus;
  openingFloat: number;
  expectedCash: number;
  countedCash: number | null;
  difference: number | null;
  totalPayments: number;
  cashPayments: number;
  refunds: number;
  manualMovements: number;
  openedAt: string;
  closedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CashSessionWithRelations extends CashSessionEntity {
  register?: CashRegisterEntity;
  opener?: { id: string; name: string; email: string };
  closer?: { id: string; name: string; email: string } | null;
  movements?: CashMovementEntity[];
  counts?: CashCountEntity[];
}

export interface CashMovementEntity {
  id: string;
  sessionId: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  referenceId: string | null;
  createdBy: string;
  createdAt: string;
}

export interface CashCountEntity {
  id: string;
  sessionId: string;
  countedCash: number;
  difference: number;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export interface CreateCashRegisterPayload {
  branchId: string;
  name: string;
  status?: CashRegisterStatus;
}

export interface OpenCashSessionPayload {
  registerId: string;
  openingFloat: number;
}

export interface CloseCashSessionPayload {
  countedCash: number | string;
  version: number;
}

export interface CreateCashMovementPayload {
  type: Extract<CashMovementType, 'CASH_IN' | 'CASH_OUT' | 'ADJUSTMENT'>;
  amount: number | string;
  reason: string;
}

export interface CreateCashCountPayload {
  countedCash: number | string;
  notes?: string;
}

export interface PaginatedCashSessionsResponse {
  data: CashSessionWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListCashSessionsQuery {
  registerId?: string;
  branchId?: string;
  status?: CashSessionStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ─── Public Menu API ──────────────────────────────────────────────────────────

export interface PublicMenuItemDto {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  status?: string;
  categoryId?: string;
}

export interface PublicCategoryDto {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  items: PublicMenuItemDto[];
}

export interface PublicBranchDto {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
}

export interface PublicTenantDto {
  slug: string;
  name: string;
  logoUrl?: string | null;
}

export interface PublicMenuResponseDto {
  tenant: PublicTenantDto;
  branch: PublicBranchDto;
  categories: PublicCategoryDto[];
  updatedAt: string;
}
