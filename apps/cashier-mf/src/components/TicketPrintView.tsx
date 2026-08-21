import type { Order } from '@maison/types';
import { toSafeNumber, toSafeString, fmtDate, fmtTime, fmtCurrency, PAYMENT_LABELS, ORDER_TYPE_LABELS } from '../lib/ticketFormat';

interface PaymentDetail {
  method: string;
  amount: number;
}

export interface TicketPrintViewProps {
  order: Order;
  restaurantName?: string;
  branchName?: string;
  paymentDetails?: PaymentDetail[];
  /** Change given back to the customer (cash overpayment only). Not persisted server-side. */
  changeAmount?: number;
}

export function TicketPrintView({ order, restaurantName, branchName, paymentDetails, changeAmount }: TicketPrintViewProps) {
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
        <div className="ticket-meta">{ORDER_TYPE_LABELS[toSafeString(order.type)] || toSafeString(order.type)}</div>
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
        {order.discount && toSafeNumber(order.discountAmount) > 0 && (
          <div className="ticket-row ticket-discount">
            <span>Dcto. ({toSafeString(order.discount.name)})</span>
            <span>-{fmtCurrency(order.discountAmount)}</span>
          </div>
        )}
        {toSafeNumber(order.promotionAmount) > 0 && (
          <div className="ticket-row ticket-discount">
            <span>Promoción</span>
            <span>-{fmtCurrency(order.promotionAmount)}</span>
          </div>
        )}
        {toSafeNumber(order.tax) > 0 && (
          <div className="ticket-row">
            <span>IVA ({Math.round(toSafeNumber(order.taxRate) * 100)}%)</span>
            <span>{fmtCurrency(order.tax)}</span>
          </div>
        )}
        {toSafeNumber(order.tipAmount) > 0 && (
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
              paymentDetails.map((pd, i) => {
                const methodKey = toSafeString(pd.method).toLowerCase();
                return (
                  <div key={i} className="ticket-payment-method">
                    {PAYMENT_LABELS[methodKey] || toSafeString(pd.method)} {fmtCurrency(pd.amount)}
                  </div>
                );
              })
            ) : (
              order.paymentMethods.map((m, i) => {
                const methodKey = toSafeString(m).toLowerCase();
                return (
                  <div key={i} className="ticket-payment-method">
                    {PAYMENT_LABELS[methodKey] || toSafeString(m)}
                  </div>
                );
              })
            )}
            {toSafeNumber(changeAmount) > 0 && (
              <div className="ticket-row ticket-total" style={{ marginTop: 4, paddingTop: 4, borderTop: '1px dashed #ccc' }}>
                <span>Cambio</span>
                <span>{fmtCurrency(changeAmount)}</span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="ticket-divider" />
      <div className="ticket-footer">¡Gracias por su preferencia!</div>
    </div>
  );
}
