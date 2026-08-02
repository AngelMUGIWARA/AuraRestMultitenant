import { useState, useEffect } from 'react';
import { on } from '@maison/event-bus';

export function useBranchFilter() {
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [isGlobal, setIsGlobal] = useState(true);

  useEffect(() => {
    const off = on('branch:changed', ({ branchId: id, isGlobal: global }) => {
      setBranchId(global ? undefined : id);
      setIsGlobal(global);
    });
    return off;
  }, []);

  return { branchId, isGlobal };
}
