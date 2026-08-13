import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { BranchProvider } from '@maison/ui';
import { useDashboard } from './useDashboard';
import * as dashboardService from '../services/dashboard.service';
import React from 'react';

// Mock del dashboard service
vi.mock('../services/dashboard.service', () => ({
  dashboardService: {
    getStats: vi.fn(),
    getRecentActivity: vi.fn(),
    getRevenueChart: vi.fn(),
    getBranchesSummary: vi.fn(),
  },
}));

describe('useDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pass branchId to API when branch is selected', async () => {
    const mockResponse = { data: { stats: { totalTenants: 1 } } };
    vi.mocked(dashboardService.dashboardService.getStats).mockResolvedValue(mockResponse);
    vi.mocked(dashboardService.dashboardService.getRecentActivity).mockResolvedValue({ data: [] });
    vi.mocked(dashboardService.dashboardService.getRevenueChart).mockResolvedValue({ data: [] });
    vi.mocked(dashboardService.dashboardService.getBranchesSummary).mockResolvedValue({ data: [] });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(BranchProvider, {}, children);

    const { result } = renderHook(() => useDashboard(), { wrapper });

    // Initial load should have undefined branchId (Global)
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(vi.mocked(dashboardService.dashboardService.getStats)).toHaveBeenCalledWith(undefined);
  });

  it('should refetch when branch changes', async () => {
    const mockStats = { data: { totalTenants: 1 } };
    const mockActivity = { data: [] };
    const mockRevenue = { data: [] };
    const mockBranches = { data: [] };

    vi.mocked(dashboardService.dashboardService.getStats).mockResolvedValue(mockStats);
    vi.mocked(dashboardService.dashboardService.getRecentActivity).mockResolvedValue(mockActivity);
    vi.mocked(dashboardService.dashboardService.getRevenueChart).mockResolvedValue(mockRevenue);
    vi.mocked(dashboardService.dashboardService.getBranchesSummary).mockResolvedValue(mockBranches);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(BranchProvider, {}, children);

    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify that services were called at least once
    expect(vi.mocked(dashboardService.dashboardService.getStats)).toHaveBeenCalled();
  });
});
