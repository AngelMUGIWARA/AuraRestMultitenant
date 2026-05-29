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
  color?: string;
  parentId?: string;
  branchId?: string;
}
