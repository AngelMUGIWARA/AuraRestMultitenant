import type { PaymentMethod } from '@maison/types';

export interface PaymentConfirmLine {
  method: PaymentMethod;
  amount: number;
  /** Cash only: physically received from the customer. */
  receivedAmount?: number;
}

interface PaymentConfirmModalProps {
  open: boolean;
  lines: PaymentConfirmLine[];
  /** Amount this confirmation actually settles (sum of `lines[].amount`). */
  totalDue: number;
  isSubmitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(value);
}

const METHOD_ICON: Record<string, string> = {
  cash: '💵',
  card: '💳',
  transfer: '🏦',
  qr: '📱',
};

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  qr: 'Código QR',
};

export function PaymentConfirmModal({ open, lines, totalDue, isSubmitting, error, onCancel, onConfirm }: PaymentConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="payment-confirm-title">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { if (!isSubmitting) onCancel(); }}
      />

      <div className="relative w-full max-w-sm bg-surface-1 border border-maison-border rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="p-5 space-y-4">
          <div>
            <h2 id="payment-confirm-title" className="text-base font-bold text-maison-cream">Confirmar cobro</h2>
            <p className="text-xs text-maison-cream-muted mt-0.5">Revisa el detalle antes de procesar el pago.</p>
          </div>

          <div className="rounded-xl bg-surface-2 border border-maison-border p-3.5 space-y-2.5">
            {lines.map((line, i) => {
              const change = line.method === 'cash' && line.receivedAmount && line.receivedAmount > line.amount
                ? line.receivedAmount - line.amount
                : 0;
              return (
                <div key={i} className={i > 0 ? 'pt-2.5 border-t border-maison-border' : ''}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-maison-cream-muted">
                      {METHOD_ICON[line.method] || '💰'} {METHOD_LABEL[line.method] || line.method}
                    </span>
                    <span className="font-mono font-semibold text-maison-cream">{formatCurrency(line.amount)}</span>
                  </div>
                  {line.method === 'cash' && line.receivedAmount ? (
                    <div className="mt-1 flex items-center justify-between text-xs text-maison-cream-dim">
                      <span>Recibido</span>
                      <span className="font-mono">{formatCurrency(line.receivedAmount)}</span>
                    </div>
                  ) : null}
                  {change > 0 && (
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-maison-amber font-medium">Cambio</span>
                      <span className="font-mono font-bold text-maison-amber">{formatCurrency(change)}</span>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="pt-2.5 border-t border-maison-border flex items-center justify-between">
              <span className="text-sm font-bold text-maison-cream">Total a cobrar</span>
              <span className="font-mono text-base font-bold text-maison-sage">{formatCurrency(totalDue)}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-maison-ruby/40 bg-maison-ruby/10 px-3 py-2 text-xs text-maison-ruby">
              {error} — puedes corregir e intentar de nuevo.
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-maison-border bg-surface-2 text-maison-cream-muted py-2.5 text-sm font-semibold hover:text-maison-cream hover:bg-surface-3 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-maison-sage text-surface-0 py-2.5 text-sm font-bold hover:bg-maison-sage/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Procesando...
                </>
              ) : (
                'Confirmar cobro'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
