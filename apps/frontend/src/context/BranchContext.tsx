'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { Branch } from '@/types/branch.types';

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
}

const BranchContext = createContext<BranchContextValue>({
  selectedBranch: GLOBAL_BRANCH,
  branches: [],
  setBranch: () => {},
  isGlobal: true,
});

interface BranchProviderProps {
  children: React.ReactNode;
  initialBranches?: Branch[];
}

export function BranchProvider({ children, initialBranches = [] }: BranchProviderProps) {
  const [selectedBranch, setSelectedBranch] = useState<Branch>(GLOBAL_BRANCH);
  const [branches] = useState<Branch[]>(initialBranches);

  const setBranch = useCallback((branch: Branch) => {
    setSelectedBranch(branch);
  }, []);

  return (
    <BranchContext.Provider
      value={{
        selectedBranch,
        branches,
        setBranch,
        isGlobal: selectedBranch.id === 'global',
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
