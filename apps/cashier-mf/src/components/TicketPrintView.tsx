import type { Order } from '@maison/types';

interface PaymentDetail {
  method: string;
  amount: number;
}

interface TicketPrintViewProps {
  order: Order;
  restaurantName?: string;
  branchName?: string;
  paymentDetails?: PaymentDetail[];
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(v);
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  qr: 'Código QR',
  other: 'Otro',
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Para aquí',
  takeaway: 'Para llevar',
  delivery: 'Delivery',
};

export function TicketPrintView({ order, restaurantName, branchName, paymentDetails }: TicketPrintViewProps) {
  return (
    <div className="ticket-content">
      <div className="ticket-header">
        <div className="ticket-restaurant">{restaurantName || 'Restaurante'}</div>
        {branchName && <div className="ticket-branch">{branchName}</div>}
        <div className="ticket-folio">Ticket #{order.orderNumber}</div>
        <div className="ticket-datetime">
          {fmtDate(order.createdAt)} {fmtTime(order.createdAt)}
        </div>
        {order.tableNumber && <div className="ticket-meta">Mesa: {order.tableNumber}</div>}
        <div className="ticket-meta">{ORDER_TYPE_LABELS[order.type] || order.type}</div>
        {order.customerName && <div className="ticket-meta">Cliente: {order.customerName}</div>}
        {order.waiterName && <div className="ticket-meta">Mesero: {order.waiterName}</div>}
      </div>

      <div className="ticket-divider" />

      <div className="ticket-items">
        {order.items.map((item) => (
          <div key={item.id} className="ticket-item">
            <div className="ticket-item-row">
              <span className="ticket-item-qty">{item.quantity}x</span>
              <span className="ticket-item-name">{item.name}</span>
              <span className="ticket-item-price">{fmtCurrency(item.totalPrice)}</span>
            </div>
            <div className="ticket-item-unit">@ {fmtCurrency(item.unitPrice)}</div>
            {item.notes && <div className="ticket-item-notes">Nota: {item.notes}</div>}
          </div>
        ))}
      </div>

      {order.notes && (
        <>
          <div className="ticket-divider" />
          <div className="ticket-item-notes" style={{ paddingLeft: 0 }}>Nota: {order.notes}</div>
        </>
      )}

      <div className="ticket-divider" />

      <div className="ticket-totals">
        <div className="ticket-row">
          <span>Subtotal</span>
          <span>{fmtCurrency(order.subtotal)}</span>
        </div>
        {order.discount && order.discountAmount != null && order.discountAmount > 0 && (
          <div className="ticket-row ticket-discount">
            <span>Dcto. ({order.discount.name})</span>
            <span>-{fmtCurrency(order.discountAmount)}</span>
          </div>
        )}
        {order.promotionAmount != null && order.promotionAmount > 0 && (
          <div className="ticket-row ticket-discount">
            <span>Promoción</span>
            <span>-{fmtCurrency(order.promotionAmount)}</span>
          </div>
        )}
        {order.tax > 0 && (
          <div className="ticket-row">
            <span>IVA ({Math.round(order.taxRate * 100)}%)</span>
            <span>{fmtCurrency(order.tax)}</span>
          </div>
        )}
        {order.tipAmount > 0 && (
          <div className="ticket-row">
            <span>Propina</span>
            <span>{fmtCurrency(order.tipAmount)}</span>
          </div>
        )}
        <div className="ticket-row ticket-total">
          <span>TOTAL</span>
          <span>{fmtCurrency(order.total)}</span>
        </div>
      </div>

      {order.paymentMethods.length > 0 && (
        <>
          <div className="ticket-divider" />
          <div className="ticket-payment">
            <div className="ticket-payment-label">Pago:</div>
            {paymentDetails && paymentDetails.length > 0 ? (
              paymentDetails.map((pd, i) => (
                <div key={i} className="ticket-payment-method">
                  {PAYMENT_LABELS[pd.method.toLowerCase()] || pd.method} {fmtCurrency(pd.amount)}
                </div>
              ))
            ) : (
              order.paymentMethods.map((m, i) => (
                <div key={i} className="ticket-payment-method">
                  {PAYMENT_LABELS[m.toLowerCase()] || m}
                </div>
              ))
            )}
          </div>
        </>
      )}

      <div className="ticket-divider" />
      <div className="ticket-footer">¡Gracias por su preferencia!</div>
    </div>
  );
}
