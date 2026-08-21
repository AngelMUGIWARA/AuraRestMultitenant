import type { TicketPrintViewProps } from '../components/TicketPrintView';
import { toSafeNumber, toSafeString, escapeHtml, fmtDate, fmtTime, fmtCurrency, PAYMENT_LABELS, ORDER_TYPE_LABELS } from './ticketFormat';

/**
 * Self-contained CSS for the isolated print document. Deliberately does not
 * reference the host app's design tokens/CSS variables: this document is
 * printed inside its own iframe, disconnected from web-shell's DOM, so it
 * must carry everything it needs to render correctly on its own.
 */
const TICKET_PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; }
  @page { size: 80mm auto; margin: 0; }

  .ticket-content {
    width: 80mm;
    padding: 4mm 3mm;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.5;
    color: #1a1a1a;
  }

  .ticket-header { text-align: center; margin-bottom: 8px; }
  .ticket-restaurant { font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
  .ticket-branch { font-size: 11px; color: #666; margin-top: 2px; }
  .ticket-folio { font-size: 11px; font-weight: bold; margin-top: 6px; }
  .ticket-datetime { font-size: 11px; color: #666; margin-top: 2px; }
  .ticket-meta { font-size: 11px; color: #444; margin-top: 2px; }
  .ticket-divider { border-top: 1px dashed #ccc; margin: 8px 0; }

  .ticket-items { margin-bottom: 4px; }
  .ticket-item { margin-bottom: 6px; }
  .ticket-item-row { display: flex; flex-wrap: wrap; gap: 4px 6px; }
  .ticket-item-qty { font-weight: bold; min-width: 24px; flex-shrink: 0; }
  .ticket-item-name { flex: 1 1 0%; min-width: 0; overflow-wrap: anywhere; word-break: break-word; hyphens: auto; }
  .ticket-item-price { font-weight: bold; text-align: right; flex-shrink: 0; white-space: nowrap; }
  .ticket-item-unit { font-size: 10px; color: #888; padding-left: 30px; }
  .ticket-item-notes { font-size: 10px; color: #888; font-style: italic; padding-left: 30px; }

  .ticket-totals { margin-bottom: 4px; }
  .ticket-row { display: flex; justify-content: space-between; font-size: 12px; }
  .ticket-discount { color: #b45648; }
  .ticket-total { font-size: 14px; font-weight: bold; border-top: 1px solid #ccc; margin-top: 4px; padding-top: 4px; }

  .ticket-payment { margin-bottom: 4px; }
  .ticket-payment-label { font-weight: bold; margin-bottom: 2px; }
  .ticket-payment-method { font-size: 11px; color: #444; }

  .ticket-footer { text-align: center; font-size: 11px; color: #888; margin-top: 4px; }
`;

/**
 * Builds the ticket body as a plain HTML string — deliberately NOT via React
 * SSR (renderToStaticMarkup/react-dom/server). cashier-mf only declares
 * `react`/`react-dom` as Module Federation shared singletons; `react-dom/server`
 * is a separate, unshared entry point, and pulling it into this remote's
 * bundle broke the shared React singleton at runtime (two React copies,
 * "Minified React error #527" when mounted inside web-shell). Building the
 * markup by hand avoids that dependency entirely. All text content is
 * escaped manually since there's no JSX to do it automatically.
 */
function renderTicketBody({ order, restaurantName, branchName, paymentDetails, changeAmount }: TicketPrintViewProps): string {
  const rows: string[] = [];

  rows.push('<div class="ticket-header">');
  rows.push(`<div class="ticket-restaurant">${escapeHtml(restaurantName || 'Restaurante')}</div>`);
  if (branchName) rows.push(`<div class="ticket-branch">${escapeHtml(branchName)}</div>`);
  rows.push(`<div class="ticket-folio">Ticket #${escapeHtml(order.orderNumber)}</div>`);
  rows.push(`<div class="ticket-datetime">${escapeHtml(fmtDate(order.createdAt))} ${escapeHtml(fmtTime(order.createdAt))}</div>`);
  if (order.tableNumber) rows.push(`<div class="ticket-meta">Mesa: ${escapeHtml(order.tableNumber)}</div>`);
  const orderType = toSafeString(order.type);
  rows.push(`<div class="ticket-meta">${escapeHtml(ORDER_TYPE_LABELS[orderType] || orderType)}</div>`);
  if (order.customerName) rows.push(`<div class="ticket-meta">Cliente: ${escapeHtml(order.customerName)}</div>`);
  if (order.waiterName) rows.push(`<div class="ticket-meta">Mesero: ${escapeHtml(order.waiterName)}</div>`);
  rows.push('</div>');

  rows.push('<div class="ticket-divider"></div>');

  rows.push('<div class="ticket-items">');
  for (const item of order.items) {
    rows.push('<div class="ticket-item">');
    rows.push('<div class="ticket-item-row">');
    rows.push(`<span class="ticket-item-qty">${escapeHtml(item.quantity)}x</span>`);
    rows.push(`<span class="ticket-item-name">${escapeHtml(item.name)}</span>`);
    rows.push(`<span class="ticket-item-price">${escapeHtml(fmtCurrency(item.totalPrice))}</span>`);
    rows.push('</div>');
    rows.push(`<div class="ticket-item-unit">@ ${escapeHtml(fmtCurrency(item.unitPrice))}</div>`);
    if (item.notes) rows.push(`<div class="ticket-item-notes">Nota: ${escapeHtml(item.notes)}</div>`);
    rows.push('</div>');
  }
  rows.push('</div>');

  if (order.notes) {
    rows.push('<div class="ticket-divider"></div>');
    rows.push(`<div class="ticket-item-notes" style="padding-left:0">Nota: ${escapeHtml(order.notes)}</div>`);
  }

  rows.push('<div class="ticket-divider"></div>');

  rows.push('<div class="ticket-totals">');
  rows.push(`<div class="ticket-row"><span>Subtotal</span><span>${escapeHtml(fmtCurrency(order.subtotal))}</span></div>`);
  if (order.discount && toSafeNumber(order.discountAmount) > 0) {
    rows.push(
      `<div class="ticket-row ticket-discount"><span>Dcto. (${escapeHtml(order.discount.name)})</span><span>-${escapeHtml(fmtCurrency(order.discountAmount))}</span></div>`,
    );
  }
  if (toSafeNumber(order.promotionAmount) > 0) {
    rows.push(`<div class="ticket-row ticket-discount"><span>Promoción</span><span>-${escapeHtml(fmtCurrency(order.promotionAmount))}</span></div>`);
  }
  if (toSafeNumber(order.tax) > 0) {
    const taxPct = Math.round(toSafeNumber(order.taxRate) * 100);
    rows.push(`<div class="ticket-row"><span>IVA (${taxPct}%)</span><span>${escapeHtml(fmtCurrency(order.tax))}</span></div>`);
  }
  if (toSafeNumber(order.tipAmount) > 0) {
    rows.push(`<div class="ticket-row"><span>Propina</span><span>${escapeHtml(fmtCurrency(order.tipAmount))}</span></div>`);
  }
  rows.push(`<div class="ticket-row ticket-total"><span>TOTAL</span><span>${escapeHtml(fmtCurrency(order.total))}</span></div>`);
  rows.push('</div>');

  if (order.paymentMethods.length > 0) {
    rows.push('<div class="ticket-divider"></div>');
    rows.push('<div class="ticket-payment">');
    rows.push('<div class="ticket-payment-label">Pago:</div>');
    if (paymentDetails && paymentDetails.length > 0) {
      for (const pd of paymentDetails) {
        const methodKey = toSafeString(pd.method).toLowerCase();
        rows.push(`<div class="ticket-payment-method">${escapeHtml(PAYMENT_LABELS[methodKey] || pd.method)} ${escapeHtml(fmtCurrency(pd.amount))}</div>`);
      }
    } else {
      for (const m of order.paymentMethods) {
        const methodKey = toSafeString(m).toLowerCase();
        rows.push(`<div class="ticket-payment-method">${escapeHtml(PAYMENT_LABELS[methodKey] || m)}</div>`);
      }
    }
    if (toSafeNumber(changeAmount) > 0) {
      rows.push(
        `<div class="ticket-row ticket-total" style="margin-top:4px;padding-top:4px;border-top:1px dashed #ccc"><span>Cambio</span><span>${escapeHtml(fmtCurrency(changeAmount))}</span></div>`,
      );
    }
    rows.push('</div>');
  }

  rows.push('<div class="ticket-divider"></div>');
  rows.push('<div class="ticket-footer">¡Gracias por su preferencia!</div>');

  return `<div class="ticket-content">${rows.join('')}</div>`;
}

/**
 * Builds a full, self-contained HTML document for the ticket. The on-screen
 * preview (TicketPrintView) and this print document share the same
 * formatting helpers (src/lib/ticketFormat.ts) and CSS class names, so print
 * output and preview always represent identical data.
 */
export function buildTicketPrintDocument(props: TicketPrintViewProps): string {
  const markup = renderTicketBody(props);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Ticket</title>
<style>${TICKET_PRINT_CSS}</style>
</head>
<body>${markup}</body>
</html>`;
}
