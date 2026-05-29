export interface Branch {
  id: string;
  name: string;
  city: string;
  address?: string;
  isGlobal?: boolean;
  isActive?: boolean;
}

export interface BranchFilters {
  isActive?: boolean;
  search?: string;
}
