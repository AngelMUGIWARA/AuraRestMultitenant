import { apiClient } from '@maison/api-client';
import type {
  ApiResponse,
  PaginatedResponse, 
  RestaurantTable,
  TableFilters,
  CreateTablePayload,
  UpdateTableStatusPayload,
} from '@maison/types';

export const tablesService = {
  // Obtener todas las mesas con filtros (branchId, etc)
  getAll: (filters?: TableFilters) =>
    apiClient.get<ApiResponse<PaginatedResponse<RestaurantTable>>>('/tables', {
      params: filters as Record<string, string | number | boolean | undefined>,
    }),

  // Obtener una mesa específica
  getById: (id: string) =>
    apiClient.get<ApiResponse<RestaurantTable>>(`/tables/${id}`),

  // Crear mesa
  create: (payload: CreateTablePayload) =>
    apiClient.post<ApiResponse<RestaurantTable>>('/tables', payload),

  // Actualizar estado (el que causaba dudas)
  updateStatus: (id: string, payload: UpdateTableStatusPayload) =>
    apiClient.patch<ApiResponse<RestaurantTable>>(`/tables/${id}/status`, payload),

  // Eliminar mesa
  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/tables/${id}`),

  findByBranch: async (branchId: string): Promise<RestaurantTable[]> => {
    try {
      const response = await apiClient.get<ApiResponse<PaginatedResponse<RestaurantTable>>>('/tables', { 
        params: { branchId } 
      });

      // Si apiClient ya extrae el body del servidor internamente:
      if (response && 'data' in response) {
        // Si el backend responde con un formato estándar { data: [...] } o { data: { items: [...] } }
        const body = response.data as any;
        if (body && body.items) return body.items; // Estructura paginada
        if (Array.isArray(body)) return body;       // Estructura array plano
        if (body && body.data) return body.data;   // Estructura ApiResponse envolvente
      }
      
      // Si response es directamente el array o el objeto de NestJS
      const directData = response as any;
      if (directData && directData.items) return directData.items;
      if (Array.isArray(directData)) return directData;

      return [];
    } catch (error) {
      console.error("Error en findByBranch de tablesService:", error);
      return [];
    }
  }
};