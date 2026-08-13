import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@maison/api-client';

vi.mock('@maison/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { tablesService } from '../../services/tables.service';

beforeEach(() => vi.clearAllMocks());

describe('tablesService (reservations-mf local)', () => {
  const mockGet = vi.mocked(apiClient.get);

  it('findByBranch calls GET /tables with branchId param', async () => {
    mockGet.mockResolvedValueOnce({
      data: { items: [{ id: 't-1', number: 1 }], total: 1 },
    });
    const result = await tablesService.findByBranch('branch-1');
    expect(mockGet).toHaveBeenCalledWith('/tables', { params: { branchId: 'branch-1' } });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t-1');
  });

  it('findByBranch handles nested data.data structure', async () => {
    mockGet.mockResolvedValueOnce({
      data: { data: [{ id: 't-2', number: 2 }] },
    });
    const result = await tablesService.findByBranch('branch-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t-2');
  });

  it('findByBranch handles flat array response', async () => {
    mockGet.mockResolvedValueOnce([{ id: 't-3', number: 3 }]);
    const result = await tablesService.findByBranch('branch-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t-3');
  });

  it('findByBranch returns empty array on error', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    const result = await tablesService.findByBranch('branch-1');
    expect(result).toEqual([]);
  });

  it('findByBranch returns empty array for empty response', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await tablesService.findByBranch('branch-1');
    expect(result).toEqual([]);
  });
});
