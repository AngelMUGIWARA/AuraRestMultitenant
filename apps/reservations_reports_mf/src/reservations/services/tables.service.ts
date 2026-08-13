import { apiClient } from '@maison/api-client';
import type { ApiResponse, PaginatedResponse, RestaurantTable } from '@maison/types';

export const tablesService = {
  findByBranch: async (branchId: string): Promise<RestaurantTable[]> => {
    try {
      const response = await apiClient.get<ApiResponse<PaginatedResponse<RestaurantTable>>>('/tables', {
        params: { branchId },
      });

      if (response && 'data' in response) {
        const body = response.data as any;
        if (body && body.items) return body.items;
        if (Array.isArray(body)) return body;
        if (body && body.data) return body.data;
      }

      const directData = response as any;
      if (directData && directData.items) return directData.items;
      if (Array.isArray(directData)) return directData;

      return [];
    } catch {
      return [];
    }
  },
};
