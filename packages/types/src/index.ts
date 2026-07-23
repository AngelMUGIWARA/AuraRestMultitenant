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

export type UserRole = "super_admin" | "admin" | "manager" | "staff";
export type UserStatus = "active" | "inactive" | "pending";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId?: string;
  tenantId?: string;
  avatarUrl?: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: string;
  tenantSlug: string;
  tenantSchemaName: string;
  branchId?: string;
  tenantId?: string;
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

export type TenantStatus = "active" | "inactive" | "suspended" | "trial";
export type TenantPlan = "starter" | "professional" | "enterprise";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  plan: TenantPlan;
  logoUrl?: string;
  ownerId: string;
  ownerEmail: string;
  restaurantCount: number;
  activeMenus: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  avgRating: number;
  createdAt: string;
  updatedAt: string;
}

export interface TenantFilters {
  status?: TenantStatus;
  plan?: TenantPlan;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "name" | "monthlyRevenue";
  sortOrder?: "asc" | "desc";
}

export interface CreateTenantPayload {
  name: string;
  slug: string;
  plan: TenantPlan;
  ownerEmail: string;
  ownerName: string;
}

export interface SuspendTenantPayload {
  reason: string;
  notifyOwner?: boolean;
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

export interface CreateBranchPayload {
  name: string;
  slug: string;
  city: string;
  address: string;
  phone?: string;
  email?: string;
  capacity?: number;
  managerName?: string;
  openingHours?: string;
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
  imageUrl?: string;
  isAvailable?: boolean;
}

export interface UpdateMenuItemPricePayload {
  price: number;
  reason?: string;
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

export type StockStatus = "ok" | "low" | "critical" | "out_of_stock";

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  totalValue: number;
  status: StockStatus;
  lastRestocked: string;
  branchId: string;
}

export interface InventoryStats {
  totalProducts: number;
  totalActive: number;
  lowStockItems: number;
  criticalItems: number;
  outOfStockItems: number;
  totalInventoryValue: number;
  categoriesCount: number;
}

export interface InventoryFilters {
  status?: StockStatus;
  categoryId?: string;
  search?: string;
  branchId?: string;
  page?: number;
  limit?: number;
  sortBy?: "name" | "currentStock" | "totalValue" | "lastRestocked";
  sortOrder?: "asc" | "desc";
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
export type PaymentStatus = "pending" | "partial" | "paid" | "refunded" | "failed";
export type OrderType = "dine_in" | "takeaway" | "delivery";

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

// ─── Discount ─────────────────────────────────────────────────────────────────

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
  discountId?: string | null;
  discountAmount?: number | null;
  taxableSubtotal?: number | null;
  discount?: {
    id: string;
    name: string;
    type: DiscountType;
    value: number;
  } | null;
  tax: number;
  taxRate: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  isFullyPaid: boolean;
  paymentMethods: PaymentMethod[];
  customerName: string;
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

export type KitchenTicketStatus = 'PENDING' | 'IN_PROGRESS' | 'READY' | 'DELIVERED';

export interface KitchenTicket {
  id: string;
  orderId: string;
  orderNumber: string;
  tableNumber?: string;
  type: OrderType;
  items: OrderItem[];
  status: KitchenTicketStatus;
  customerName: string;
  notes?: string;
  branchId: string;
  priority: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  elapsedSeconds: number;
}

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
  tip?: {
    amount: string;
    method: 'PERCENTAGE' | 'FIXED';
  };
}

// ─── Reservation ──────────────────────────────────────────────────────────────

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'arrived'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Reservation {
  id: string;
  confirmationCode: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  partySize: number;
  date: string;
  time: string;
  durationMinutes: number;
  status: ReservationStatus;
  tableId?: string;
  tableName?: string;
  notes?: string;
  specialRequests?: string;
  branchId: string;
  createdAt: string;
  updatedAt: string;
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
  notes?: string;
  branchId: string;
  tableId?: string;
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
  seedWord: string;
}

export interface VoiceSeedResponse {
  voiceUsername: string;
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
