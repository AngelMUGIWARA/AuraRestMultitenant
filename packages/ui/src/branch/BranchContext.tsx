'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { emit, on } from '@maison/event-bus';
import { AuthClient } from '@maison/auth-client';
import type { Branch, ApiResponse, PaginatedResponse } from '@maison/types';

// Dynamic import to avoid circular dependencies - apiClient includes auth headers
let apiClient: any = null;
const getApiClient = async () => {
  if (!apiClient) {
    try {
      const module = await import('@maison/api-client');
      apiClient = module.apiClient;
    } catch {
      // Silent fail - apiClient will be null
    }
  }
  return apiClient;
};

export const GLOBAL_BRANCH: Branch = {
  id: 'global',
  name: 'Global',
  city: 'Todas las sucursales',
  isGlobal: true,
  isActive: true,
};

interface BranchContextValue {
  selectedBranch: Branch;
  branches: Branch[];
  setBranch: (branch: Branch) => void;
  isGlobal: boolean;
  isLoading: boolean;
}

const BranchContext = createContext<BranchContextValue>({
  selectedBranch: GLOBAL_BRANCH,
  branches: [],
  setBranch: () => {},
  isGlobal: true,
  isLoading: true,
});

interface BranchProviderProps {
  children: React.ReactNode;
  initialBranches?: Branch[];
}

export function BranchProvider({ children, initialBranches = [] }: BranchProviderProps) {
  const [selectedBranch, setSelectedBranch] = useState<Branch>(GLOBAL_BRANCH);
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [isLoading, setIsLoading] = useState(initialBranches.length === 0);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const offBranchChange = on('branch:changed', ({ branchId, branchName, isGlobal }) => {
      setSelectedBranch({ id: branchId, name: branchName, city: '', isGlobal, isActive: true });
    });

    // Reload branches when auth changes
    const offAuthLogin = on('auth:login', () => {
      setAuthReady(true);
    });

    const offAuthLogout = on('auth:logout', () => {
      setBranches([]);
      setSelectedBranch(GLOBAL_BRANCH);
      setIsLoading(false);
      setAuthReady(false);
    });

    // Check if already authenticated on mount
    if (AuthClient.getAccessToken()) {
      setAuthReady(true);
    }

    return () => {
      offBranchChange?.();
      offAuthLogin?.();
      offAuthLogout?.();
    };
  }, []);

  useEffect(() => {
    if (initialBranches.length > 0) {
      setBranches(initialBranches);
      setIsLoading(false);
      return;
    }

    if (!authReady) {
      return;
    }

    let cancelled = false;

    const loadBranches = async () => {
      try {
        const isAuthenticated = AuthClient.getAccessToken();
        const tenantSlug = AuthClient.getTenantSlug();

        if (!isAuthenticated || !tenantSlug) {
          if (!cancelled) setIsLoading(false);
          return;
        }

        const client = await getApiClient();

        if (!client) {
          if (!cancelled) setIsLoading(false);
          return;
        }

        const response = await client.get<ApiResponse<PaginatedResponse<Branch>>>('/admin/branches', {
          params: { page: 1, limit: 100 },
        });

        if (!cancelled) {
          let branchList: Branch[] = [];

          if (Array.isArray(response?.data?.data)) {
            branchList = response.data.data;
          } else if (Array.isArray(response?.data)) {
            branchList = response.data;
          } else if (Array.isArray(response)) {
            branchList = response;
          }

          setBranches(branchList);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadBranches();
    return () => { cancelled = true; };
  }, [initialBranches.length, authReady]);

  const setBranch = useCallback((branch: Branch) => {
    setSelectedBranch(branch);
    emit('branch:changed', {
      branchId: branch.id,
      branchName: branch.name,
      isGlobal: branch.id === 'global',
    });
  }, []);

  return (
    <BranchContext.Provider
      value={{
        selectedBranch,
        branches,
        setBranch,
        isGlobal: selectedBranch.id === 'global',
        isLoading,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
