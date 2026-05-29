import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconOrders } from '@/components/ui/Icons';

export const metadata: Metadata = { title: 'Pedidos' };

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <header>
        <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">
          Pedidos
        </h1>
        <p className="mt-1.5 text-sm text-maison-cream-muted">
          Historial y seguimiento de pedidos
        </p>
      </header>
      <div className="card">
        <EmptyState
          icon={<IconOrders className="h-6 w-6" />}
          title="Módulo en construcción"
          description="El historial de pedidos estará disponible cuando el API esté conectado."
          className="py-20"
        />
      </div>
    </div>
  );
}
