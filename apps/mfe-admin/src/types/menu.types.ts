export type MenuItemStatus = 'available'|'unavailable'|'out_of_stock';
export interface MenuItem {
  id: string; name: string; description?: string; categoryId: string; categoryName: string;
  price: number; originalPrice?: number; imageUrl?: string; status: MenuItemStatus;
  isPopular: boolean; isFeatured: boolean; preparationTime: number; allergens?: string[];
  branchId?: string; createdAt: string; updatedAt: string;
}
export interface MenuStats { totalItems: number; availableItems: number; unavailableItems: number; outOfStockItems: number; totalCategories: number; avgPrice: number; popularItems: number; }
export interface MenuFilters { status?: MenuItemStatus; categoryId?: string; isPopular?: boolean; branchId?: string; search?: string; page?: number; limit?: number; sortBy?: 'name'|'price'|'createdAt'; sortOrder?: 'asc'|'desc'; }
export interface CreateMenuItemPayload { name: string; description?: string; categoryId: string; price: number; preparationTime: number; branchId?: string; }
export interface UpdateMenuItemPricePayload { price: number; reason?: string; }
