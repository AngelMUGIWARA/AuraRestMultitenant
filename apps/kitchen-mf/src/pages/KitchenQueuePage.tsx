import { useEffect, useState } from 'react';
import { getIsReadOnly } from '@maison/auth-client';
import { useKitchenQueue } from '../hooks/useKitchenQueue';
import type { KitchenTicket, KitchenTicketStatus } from '@maison/types';

const STATUS_CONFIG: Record<KitchenTicketStatus, { label: string; bg: string; border: string; text: string }> = {
  PENDING:     { label: 'Nuevo',          bg: 'bg-maison-ruby/10',  border: 'border-maison-ruby/40',  text: 'text-maison-ruby' },
  PREPARING:   { label: 'En preparación', bg: 'bg-maison-amber/10', border: 'border-maison-amber/40', text: 'text-maison-amber' },
  READY:       { label: 'Listo',          bg: 'bg-maison-sage/10',  border: 'border-maison-sage/40',  text: 'text-maison-sage' },
  DELIVERED:   { label: 'Entregado',      bg: 'bg-maison-sage/10',  border: 'border-maison-sage/40',  text: 'text-maison-sage' },
  CANCELLED:   { label: 'Cancelado',      bg: 'bg-maison-ruby/10',  border: 'border-maison-ruby/40',  text: 'text-maison-ruby' },
};

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// El backend ya no manda elapsedSeconds precalculado; se recalcula aquí
// desde ticket.createdAt (mismo punto de referencia que usaba el backend
// antes de que se quitara el campo), refrescado cada segundo.
function useElapsedSeconds(createdAt: string): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return Math.floor((now - new Date(createdAt).getTime()) / 1000);
}

function KitchenTicketCard({ ticket, onUpdateStatus, readOnly }: {
  ticket: KitchenTicket;
  onUpdateStatus: (ticketId: string, orderId: string, orderNumber: string, status: KitchenTicketStatus) => void;
  readOnly?: boolean;
}) {
  const cfg = STATUS_CONFIG[ticket.status];
  const elapsedSeconds = useElapsedSeconds(ticket.createdAt);
  const isOverdue = elapsedSeconds > 900;

  return (
    <article className={`flex flex-col gap-0 rounded-xl border-2 overflow-hidden ${cfg.border} ${cfg.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xl font-bold text-maison-cream">#{ticket.orderNumber ?? '—'}</span>
          {ticket.tableNumber && (
            <span className="text-xs bg-white/10 rounded px-1.5 py-0.5 text-maison-cream-dim">
              Mesa {ticket.tableNumber}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1.5 font-mono text-sm font-medium ${isOverdue ? 'text-maison-ruby animate-pulse' : 'text-maison-cream-dim'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-3.5 w-3.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          {formatElapsed(elapsedSeconds)}
        </div>
      </div>

      {/* Items */}
      <ul className="flex-1 px-4 py-3 space-y-2">
        {ticket.items.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <span className="flex-shrink-0 font-mono text-lg font-bold text-maison-cream leading-none mt-0.5">
              {item.quantity}×
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-maison-cream">{item.menuItemName}</p>
              {item.notes && <p className="text-xs text-maison-cream-muted mt-0.5 italic">{item.notes}</p>}
            </div>
          </li>
        ))}
      </ul>

      {/* Notes */}
      {ticket.notes && (
        <div className="px-4 py-2 border-t border-white/10">
          <p className="text-xs text-maison-cream-muted italic">⚠ {ticket.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-4 py-3 border-t border-white/10">
        {!readOnly && ticket.status === 'PENDING' && (
          <button
            type="button"
            onClick={() => onUpdateStatus(ticket.id, ticket.orderId, ticket.orderNumber ?? '', 'PREPARING')}
            className="flex-1 rounded-lg bg-maison-amber/20 border border-maison-amber/50 py-2 text-sm font-medium text-maison-amber hover:bg-maison-amber/30 transition"
          >
            Iniciar preparación
          </button>
        )}
        {!readOnly && ticket.status === 'PREPARING' && (
          <button
            type="button"
            onClick={() => onUpdateStatus(ticket.id, ticket.orderId, ticket.orderNumber ?? '', 'READY')}
            className="flex-1 rounded-lg bg-maison-sage/20 border border-maison-sage/50 py-2 text-sm font-medium text-maison-sage hover:bg-maison-sage/30 transition"
          >
            Marcar como listo ✓
          </button>
        )}
        {(!readOnly && ticket.status === 'READY') && (
          <span className="flex-1 text-center text-sm font-medium text-maison-sage py-2">
            ✓ Listo para servir
          </span>
        )}
        {readOnly && ticket.status !== 'DELIVERED' && (
          <span className="flex-1 text-center text-sm font-medium text-maison-cream-dim py-2">
            {STATUS_CONFIG[ticket.status].label}
          </span>
        )}
      </div>
    </article>
  );
}

export default function KitchenQueuePage() {
  const { tickets, isLoading, error, wsConnected, updateTicketStatus } = useKitchenQueue();
  const readOnly = getIsReadOnly();

  const newTickets = tickets.filter((t) => t.status === 'PENDING');
  const inProgressTickets = tickets.filter((t) => t.status === 'PREPARING');
  const readyTickets = tickets.filter((t) => t.status === 'READY');

  return (
    <div className="min-h-screen bg-surface-0 p-4 lg:p-6">
      {/* KDS Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-1 border border-maison-border">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5 text-maison-amber" aria-hidden="true"><path d="M6 2v20M18 2v20M6 12h12M3 7h18M3 17h18" /></svg>
          </div>
          <div>
            <h1 className="font-display text-xl font-medium text-maison-cream">Cocina — KDS</h1>
            <p className="text-xs text-maison-cream-muted">Kitchen Display System</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs font-medium ${wsConnected ? 'text-maison-sage' : 'text-maison-ruby'}`}>
            <span className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-maison-sage animate-pulse' : 'bg-maison-ruby'}`} />
            {wsConnected ? 'Tiempo real' : 'Polling'}
          </span>
          <span className="text-xs text-maison-cream-dim font-mono">
            {tickets.length} orden{tickets.length !== 1 ? 'es' : ''}
          </span>
        </div>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-maison-amber border-t-transparent animate-spin mx-auto" />
            <p className="text-sm text-maison-cream-muted">Cargando cola de cocina…</p>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="card p-6 text-center">
          <p className="text-sm text-maison-ruby">{error}</p>
        </div>
      )}

      {!isLoading && !error && tickets.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <p className="text-2xl text-maison-cream-dim">✓</p>
            <p className="text-sm font-medium text-maison-cream">Sin órdenes pendientes</p>
            <p className="text-xs text-maison-cream-muted">Las nuevas órdenes aparecerán aquí automáticamente</p>
          </div>
        </div>
      )}

      {/* Columns: New | In Progress | Ready */}
      {!isLoading && !error && tickets.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-maison-ruby" />
              <h2 className="text-sm font-medium text-maison-cream uppercase tracking-wider">Nuevos ({newTickets.length})</h2>
            </div>
            <div className="space-y-4">
              {newTickets.map((t) => <KitchenTicketCard key={t.id} ticket={t} onUpdateStatus={updateTicketStatus} readOnly={readOnly} />)}
              {newTickets.length === 0 && <p className="text-xs text-maison-cream-dim text-center py-8">Sin nuevas órdenes</p>}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-maison-amber" />
              <h2 className="text-sm font-medium text-maison-cream uppercase tracking-wider">En preparación ({inProgressTickets.length})</h2>
            </div>
            <div className="space-y-4">
              {inProgressTickets.map((t) => <KitchenTicketCard key={t.id} ticket={t} onUpdateStatus={updateTicketStatus} readOnly={readOnly} />)}
              {inProgressTickets.length === 0 && <p className="text-xs text-maison-cream-dim text-center py-8">Sin órdenes en preparación</p>}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-maison-sage" />
              <h2 className="text-sm font-medium text-maison-cream uppercase tracking-wider">Listos ({readyTickets.length})</h2>
            </div>
            <div className="space-y-4">
              {readyTickets.map((t) => <KitchenTicketCard key={t.id} ticket={t} onUpdateStatus={updateTicketStatus} readOnly={readOnly} />)}
              {readyTickets.length === 0 && <p className="text-xs text-maison-cream-dim text-center py-8">Sin órdenes listas</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
