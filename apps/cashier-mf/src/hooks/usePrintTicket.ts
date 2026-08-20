import { useState, useCallback, useRef, useLayoutEffect } from 'react';
import type { Order } from '@maison/types';

export interface TicketPaymentDetail {
  method: string;
  amount: number;
}

export interface UsePrintTicketParams {
  onPrintComplete: (orderId: string) => Promise<Order | null>;
}

export function usePrintTicket({ onPrintComplete }: UsePrintTicketParams) {
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [directPrintOrder, setDirectPrintOrder] = useState<Order | null>(null);
  const [ticketPaymentDetails, setTicketPaymentDetails] = useState<TicketPaymentDetail[]>([]);
  const autoPrintTriggered = useRef(false);
  const directPrintRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (directPrintOrder && directPrintRef.current) {
      window.print();
      onPrintComplete(directPrintOrder.id);
      setDirectPrintOrder(null);
    }
  }, [directPrintOrder, onPrintComplete]);

  const openPreview = useCallback((order: Order) => {
    setPreviewOrder(order);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOrder(null);
  }, []);

  const printFromPreview = useCallback(() => {
    if (!previewOrder) return;
    window.print();
    onPrintComplete(previewOrder.id);
    setPreviewOrder(null);
  }, [previewOrder, onPrintComplete]);

  const triggerAutoPrint = useCallback((order: Order, showPreview: boolean) => {
    if (autoPrintTriggered.current) return;
    autoPrintTriggered.current = true;

    if (showPreview) {
      setPreviewOrder(order);
    } else {
      setDirectPrintOrder(order);
    }
  }, []);

  const setPaymentDetailsForTicket = useCallback((details: TicketPaymentDetail[]) => {
    setTicketPaymentDetails(details);
  }, []);

  const resetAutoPrint = useCallback(() => {
    autoPrintTriggered.current = false;
    setPreviewOrder(null);
    setDirectPrintOrder(null);
    setTicketPaymentDetails([]);
  }, []);

  return {
    previewOrder,
    directPrintOrder,
    directPrintRef,
    ticketPaymentDetails,
    openPreview,
    closePreview,
    printFromPreview,
    triggerAutoPrint,
    setPaymentDetailsForTicket,
    resetAutoPrint,
  };
}
