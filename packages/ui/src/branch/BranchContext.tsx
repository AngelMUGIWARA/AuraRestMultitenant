'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { emit, on } from '@maison/event-bus';
import type { Branch } from '@maison/types';

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

  useEffect(() => {
    const off = on('branch:changed', ({ branchId, branchName, isGlobal }) => {
      setSelectedBranch({ id: branchId, name: branchName, city: '', isGlobal, isActive: true });
    });
    return off;
  }, []);

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
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
