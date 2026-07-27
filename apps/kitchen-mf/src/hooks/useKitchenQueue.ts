import { useState, useEffect, useCallback } from 'react';
import { on, emit } from '@maison/event-bus';
import { kitchenService } from '../services/kitchen.service';
import type { KitchenTicket, KitchenTicketStatus, OrderStatus } from '@maison/types';

const POLL_INTERVAL_MS = 30_000;

export function useKitchenQueue() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [wsConnected, setWsConnected] = useState(false);

  const fetchQueue = useCallback(async (bId?: string) => {
    try {
      const res = await kitchenService.getQueue(bId);
      setTickets(Array.isArray(res) ? res : (res as any).data ?? []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar la cola');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue(branchId);

    // Try WebSocket — fallback to polling if unavailable
    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    try {
      const wsUrl = ((import.meta as any).env?.VITE_KITCHEN_WS_URL as string | undefined) ?? 'ws://localhost:3001/kitchen/queue';
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setWsConnected(true);
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data as string) as { tickets: KitchenTicket[] };
          setTickets(data.tickets);
        } catch {}
      };
      ws.onerror = () => {
        setWsConnected(false);
        ws?.close();
        // fallback polling
        pollTimer = setInterval(() => fetchQueue(branchId), POLL_INTERVAL_MS);
      };
      ws.onclose = () => setWsConnected(false);
    } catch {
      pollTimer = setInterval(() => fetchQueue(branchId), POLL_INTERVAL_MS);
    }

    // Subscribe to event-bus events for instant updates
    const offCreated = on('order:created', () => fetchQueue(branchId));
    const offUpdated = on('order:updated', () => fetchQueue(branchId));

    // Subscribe to branch changes
    const offBranch = on('branch:changed', ({ branchId: id, isGlobal }) => {
      const newBranchId = isGlobal ? undefined : id;
      setBranchId(newBranchId);
      fetchQueue(newBranchId);
    });

    return () => {
      ws?.close();
      if (pollTimer) clearInterval(pollTimer);
      offCreated();
      offUpdated();
      offBranch();
    };
  }, [fetchQueue]);

  const updateTicketStatus = useCallback(async (ticketId: string, orderId: string, orderNumber: string, status: KitchenTicketStatus) => {
    try {
      await kitchenService.updateTicketStatus(ticketId, status);
      setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status } : t));
      // Publish status change so orders-mf and cashier-mf can react
      emit('order:status-changed', { orderId, orderNumber, status: status as unknown as OrderStatus });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar estado');
    }
  }, []);

  return { tickets, isLoading, error, wsConnected, updateTicketStatus };
}
