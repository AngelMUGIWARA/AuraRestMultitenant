import { apiClient } from '@maison/api-client';
import type {
  ApiResponse,
  CreateInventoryItemPayload,
  CreateMovementPayload,
  CreateSupplierPayload,
  InventoryItem,
  InventoryMovement,
  InventoryStockRow,
  MenuAvailability,
  MenuItemRecipe,
  StockAlert,
  Supplier,
  UpsertRecipePayload,
} from '@maison/types';

/** Convierte 'global' (BranchSelector) en "sin filtro" para la API */
const branchParam = (branchId?: string) =>
  branchId && branchId !== 'global' ? { branchId } : undefined;

export const inventoryService = {
  // ── Insumos ────────────────────────────────────────────────
  getItems(filters?: { isActive?: boolean; search?: string; branchId?: string }) {
    return apiClient.get<ApiResponse<{ data: InventoryItem[]; total: number }>>(
      '/admin/inventory/items',
      {
        params: {
          isActive: filters?.isActive,
          search: filters?.search,
          ...branchParam(filters?.branchId),
        } as Record<string, string | boolean | undefined>,
      },
    );
  },

  createItem(payload: CreateInventoryItemPayload) {
    return apiClient.post<ApiResponse<InventoryItem>>('/admin/inventory/items', payload);
  },

  updateItem(id: string, payload: Partial<CreateInventoryItemPayload>) {
    return apiClient.put<ApiResponse<InventoryItem>>(`/admin/inventory/items/${id}`, payload);
  },

  removeItem(id: string) {
    return apiClient.delete<ApiResponse<InventoryItem>>(`/admin/inventory/items/${id}`);
  },

  // ── Proveedores (solo OWNER/ADMIN) ─────────────────────────
  getSuppliers(isActive?: boolean) {
    return apiClient.get<ApiResponse<Supplier[]>>('/admin/inventory/suppliers', {
      params: isActive !== undefined ? { isActive } : undefined,
    });
  },

  createSupplier(payload: CreateSupplierPayload) {
    return apiClient.post<ApiResponse<Supplier>>('/admin/inventory/suppliers', payload);
  },

  updateSupplier(id: string, payload: Partial<CreateSupplierPayload>) {
    return apiClient.put<ApiResponse<Supplier>>(`/admin/inventory/suppliers/${id}`, payload);
  },

  removeSupplier(id: string) {
    return apiClient.delete<ApiResponse<Supplier>>(`/admin/inventory/suppliers/${id}`);
  },

  // ── Stock y alertas ────────────────────────────────────────
  getStock(branchId?: string) {
    return apiClient.get<ApiResponse<InventoryStockRow[]>>('/admin/inventory/stock', {
      params: branchParam(branchId),
    });
  },

  getAlerts(branchId?: string) {
    return apiClient.get<ApiResponse<StockAlert[]>>('/admin/inventory/stock/alerts', {
      params: branchParam(branchId),
    });
  },

  // ── Movimientos ────────────────────────────────────────────
  getMovements(filters?: { branchId?: string; itemId?: string; type?: string }) {
    return apiClient.get<ApiResponse<InventoryMovement[]>>('/admin/inventory/movements', {
      params: {
        ...branchParam(filters?.branchId),
        itemId: filters?.itemId,
        type: filters?.type,
      },
    });
  },

  createMovement(payload: CreateMovementPayload) {
    return apiClient.post<ApiResponse<{ movement: InventoryMovement }>>(
      '/admin/inventory/movements',
      payload,
    );
  },

  // ── Recetas ────────────────────────────────────────────────
  getRecipe(menuItemId: string) {
    return apiClient.get<ApiResponse<MenuItemRecipe>>(`/admin/inventory/recipes/${menuItemId}`);
  },

  replaceRecipe(menuItemId: string, payload: UpsertRecipePayload) {
    return apiClient.put<ApiResponse<MenuItemRecipe>>(
      `/admin/inventory/recipes/${menuItemId}`,
      payload,
    );
  },

  // ── Disponibilidad (todos los roles) ───────────────────────
  getAvailability(branchId?: string) {
    return apiClient.get<ApiResponse<MenuAvailability[]>>('/admin/inventory/availability', {
      params: branchParam(branchId),
    });
  },
};
