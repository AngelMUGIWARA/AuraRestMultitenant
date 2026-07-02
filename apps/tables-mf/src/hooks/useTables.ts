import { useState, useEffect, useCallback } from 'react';
import { on } from '@maison/event-bus';
import type { RestaurantTable, TableFilters, PaginatedResponse } from '@maison/types';
import { tablesService } from '../services/tables.service'; // Asegúrate de tener este servicio
import { useBranch } from '../context/BranchContext'; // Tu nuevo hook de contexto
import { TableStatus } from '@maison/types';

export function useTables() {
  const { selectedBranch } = useBranch(); // Obtenemos la branch activa globalmente
  const [tables, setTables] = useState<PaginatedResponse<RestaurantTable> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<TableFilters>({ page: 1, limit: 30 });
  const [isActing, setIsActing] = useState(false);

  const setFilters = useCallback(
    (patch: Partial<TableFilters>) => setFiltersState((p) => ({ ...p, ...patch, page: 1 })),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    // Si seleccionas "Global" (Todas las sucursales), enviamos undefined o lo que tu API espere
    const branchId = selectedBranch.isGlobal ? undefined : selectedBranch.id;

    tablesService.getAll({ ...filters, branchId })
      .then((response) => {
        if (!cancelled) setTables(response.data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error('Error al cargar mesas'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    // Escuchamos eventos de cambios de estado en las mesas
    const offTableUpdated = on('table:status-changed', () => setTick((t) => t + 1));

    return () => {
      cancelled = true;
      offTableUpdated();
    };
  }, [selectedBranch.id, filters, tick]);

  const updateTableStatus = useCallback(async (tableId: string, status: string) => {
    setIsActing(true);
    try {
      const statusEnum = status as TableStatus; 
      await tablesService.updateStatus(tableId, { status: statusEnum });
      setTick((t) => t + 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error('Error al actualizar mesa'));
    } finally {
      setIsActing(false);
    }
  }, []);

  return {
    tables,
    isLoading,
    error,
    filters,
    setFilters,
    refresh: () => setTick((t) => t + 1),
    updateTableStatus,
    isActing,
    branch: selectedBranch
  };
}