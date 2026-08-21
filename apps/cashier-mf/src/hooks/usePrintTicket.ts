import { useState, useCallback, useRef } from 'react';
import type { Order } from '@maison/types';
import { buildTicketPrintDocument } from '../lib/ticketDocument';
import { printHtmlDocument } from '../lib/printFrame';

export interface TicketPaymentDetail {
  method: string;
  amount: number;
}

export interface UsePrintTicketParams {
  onPrintComplete: (orderId: string) => Promise<Order | null>;
  /** Branch name to display on the ticket; kept in sync with the caller's
   * current selection so preview and print always show the same branch. */
  branchName?: string;
}

export function usePrintTicket({ onPrintComplete, branchName }: UsePrintTicketParams) {
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [ticketPaymentDetails, setTicketPaymentDetails] = useState<TicketPaymentDetail[]>([]);
  const [ticketChangeAmount, setTicketChangeAmount] = useState(0);
  const autoPrintTriggered = useRef(false);

  const openPreview = useCallback((order: Order) => {
    setPreviewOrder(order);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOrder(null);
  }, []);

  const printOrder = useCallback(
    (order: Order, paymentDetails: TicketPaymentDetail[], changeAmount = 0) => {
      const html = buildTicketPrintDocument({ order, branchName, paymentDetails, changeAmount });
      printHtmlDocument(html);
    },
    [branchName],
  );

  const printFromPreview = useCallback(() => {
    if (!previewOrder) return;
    printOrder(previewOrder, ticketPaymentDetails, ticketChangeAmount);
    onPrintComplete(previewOrder.id);
    setPreviewOrder(null);
  }, [previewOrder, ticketPaymentDetails, ticketChangeAmount, printOrder, onPrintComplete]);

  // `paymentDetails`/`changeAmount` are accepted explicitly (instead of only
  // reading state) because callers often call setPaymentDetailsForTicket(...)
  // and triggerAutoPrint(...) back to back in the same tick; reading state
  // here would race a stale closure.
  const triggerAutoPrint = useCallback(
    (order: Order, showPreview: boolean, paymentDetails?: TicketPaymentDetail[], changeAmount = 0) => {
      if (autoPrintTriggered.current) return;
      autoPrintTriggered.current = true;

      if (showPreview) {
        setPreviewOrder(order);
        setTicketChangeAmount(changeAmount);
      } else {
        printOrder(order, paymentDetails ?? ticketPaymentDetails, changeAmount);
        onPrintComplete(order.id);
      }
    },
    [printOrder, ticketPaymentDetails, onPrintComplete],
  );

  const setPaymentDetailsForTicket = useCallback((details: TicketPaymentDetail[]) => {
    setTicketPaymentDetails(details);
  }, []);

  const setChangeForTicket = useCallback((amount: number) => {
    setTicketChangeAmount(amount);
  }, []);

  const resetAutoPrint = useCallback(() => {
    autoPrintTriggered.current = false;
    setPreviewOrder(null);
    setTicketPaymentDetails([]);
    setTicketChangeAmount(0);
  }, []);

  return {
    previewOrder,
    ticketPaymentDetails,
    ticketChangeAmount,
    openPreview,
    closePreview,
    printFromPreview,
    triggerAutoPrint,
    setPaymentDetailsForTicket,
    setChangeForTicket,
    resetAutoPrint,
  };
}
