import { apiClient } from '@maison/api-client';
import type { Branch } from '@maison/types';

// El endpoint de sucursales no usa el interceptor de transformación ni aplica
// filtros de query (BranchFiltersDto está vacío en el backend), así que el
// cuerpo real es { data: Branch[], total } sin el sobre { data, message, ... }.
interface BranchesListResponse {
  data: Branch[];
  total: number;
}

export const branchesService = {
  getAll: () => apiClient.get<BranchesListResponse>('/admin/branches', {
    params: { status: 'active' }
  }),
};
