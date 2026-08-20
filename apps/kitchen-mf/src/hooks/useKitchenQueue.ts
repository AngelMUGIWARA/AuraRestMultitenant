import { useState, useEffect, useCallback, useRef } from 'react';
import { on, emit } from '@maison/event-bus';
import { kitchenService } from '../services/kitchen.service';
import type { KitchenTicket, KitchenTicketStatus, OrderStatus } from '@maison/types';

const POLL_INTERVAL_MS = 10_000;

// KitchenTicketStatus ('PREPARING'|'READY'|...) y OrderStatus ('preparing'|'ready'|...)
// usan vocabularios distintos (mayúsculas vs. minúsculas, valores distintos). Sin este
// mapeo, STATUS_CONFIG[order.status] en OrdersPage no encuentra la clave y rompe el render.
const TICKET_TO_ORDER_STATUS: Partial<Record<KitchenTicketStatus, OrderStatus>> = {
  PREPARING: 'preparing' as OrderStatus,
  READY: 'ready' as OrderStatus,
  DELIVERED: 'delivered' as OrderStatus,
};

export function useKitchenQueue() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [wsConnected, setWsConnected] = useState(false);

  // Ref para que el polling y los listeners siempre usen la sucursal vigente,
  // sin depender del closure inicial del efecto.
  const branchIdRef = useRef(branchId);
  branchIdRef.current = branchId;

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

    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    // WebSocket solo si hay una URL configurada. Sin servidor WS (no existe en
    // el backend) no se crea un WebSocket hacia un endpoint muerto, evitando el
    // error "WebSocket is closed before the connection is established".
    const wsUrl = (import.meta as any).env?.VITE_KITCHEN_WS_URL as string | undefined;

    if (wsUrl) {
      try {
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
          pollTimer = setInterval(() => fetchQueue(branchIdRef.current), POLL_INTERVAL_MS);
        };
        ws.onclose = () => setWsConnected(false);
      } catch {
        pollTimer = setInterval(() => fetchQueue(branchIdRef.current), POLL_INTERVAL_MS);
      }
    } else {
      // Sin WS configurado: polling directo
      pollTimer = setInterval(() => fetchQueue(branchIdRef.current), POLL_INTERVAL_MS);
    }

    // Subscribe to event-bus events for instant updates
    const offCreated = on('order:created', () => fetchQueue(branchIdRef.current));
    const offUpdated = on('order:updated', () => fetchQueue(branchIdRef.current));

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
        const mappedStatus = TICKET_TO_ORDER_STATUS[status];
        if (mappedStatus) {
          emit('order:status-changed', {
            orderId,
            orderNumber,
            status: mappedStatus,
          });
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al actualizar estado');
      }
    },
    [],
  );
  return { tickets, isLoading, error, wsConnected, updateTicketStatus };
}