import { useCallback, useEffect, useState } from 'react';

import type { PublicMenuResponseDto } from '@maison/types';

import { publicMenuService } from '../services/publicMenu.service';

export function usePrintableMenu(branchId?: string) {
  const [menu, setMenu] = useState<PublicMenuResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await publicMenuService.getPrintableMenu(branchId);

      setMenu(response.data);
    } catch (err) {
      console.error(err);
      setError('No fue posible cargar el menú.');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  return {
    menu,
    loading,
    error,
    refresh: fetchMenu,
  };
}