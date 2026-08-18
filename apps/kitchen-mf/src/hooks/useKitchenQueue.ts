import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
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

    let socket: Socket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (!pollTimer) {
        pollTimer = setInterval(() => fetchQueue(branchId), POLL_INTERVAL_MS);
      }
    };

    const connectSocket = () => {
      // Extraer el token de donde lo almacenes en tu app (localStorage, cookies, etc.)
      const token = localStorage.getItem('token') || ''; 
      const baseUrl = ((import.meta as any).env?.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

      // Conectarse al namespace /kitchen configurado en NestJS
      socket = io(`${baseUrl}/kitchen`, {
        query: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        setWsConnected(true);
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      });

      // El gateway emite 'queueUpdated' cuando hay cambios, llamamos a fetchQueue
      socket.on('queueUpdated', () => {
        fetchQueue(branchId);
      });

      socket.on('connect_error', () => {
        setWsConnected(false);
        startPolling();
      });

      socket.on('disconnect', () => {
        setWsConnected(false);
        startPolling();
      });
    };

    connectSocket();

    const offCreated = on('order:created', () => fetchQueue(branchId));
    const offUpdated = on('order:updated', () => fetchQueue(branchId));

    const offBranch = on('branch:changed', ({ branchId: id, isGlobal }) => {
      const newBranchId = isGlobal ? undefined : id;
      setBranchId(newBranchId);
      fetchQueue(newBranchId);
    });

    return () => {
      socket?.disconnect();
      if (pollTimer) clearInterval(pollTimer);
      offCreated();
      offUpdated();
      offBranch();
    };
  }, [fetchQueue, branchId]);

  const updateTicketStatus = useCallback(
    async (
      ticketId: string,
      orderId: string,
      orderNumber: string,
      status: KitchenTicketStatus,
      version: number,
      reason?: string,
    ) => {
      try {
        await kitchenService.updateTicketStatus(ticketId, { status, version, reason });
        // Optimistic update: increment version locally
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId ? { ...t, status, version: version + 1 } : t,
          ),
        );
        emit('order:status-changed', {
          orderId,
          orderNumber,
          status: status as unknown as OrderStatus,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al actualizar estado');
      }
    },
    [],
  );
  return { tickets, isLoading, error, wsConnected, updateTicketStatus };
}