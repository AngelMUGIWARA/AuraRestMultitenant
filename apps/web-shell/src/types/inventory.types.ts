export type StockStatus = 'ok' | 'low' | 'critical' | 'out_of_stock';

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
  sortBy?: 'name' | 'currentStock' | 'totalValue' | 'lastRestocked';
  sortOrder?: 'asc' | 'desc';
}
