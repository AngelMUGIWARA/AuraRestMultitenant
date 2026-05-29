import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconIntegrations } from '@/components/ui/Icons';

export const metadata: Metadata = { title: 'Integraciones' };

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <header>
        <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">
          Integraciones
        </h1>
        <p className="mt-1.5 text-sm text-maison-cream-muted">
          Conexiones con servicios externos y APIs de terceros
        </p>
      </header>
      <div className="card">
        <EmptyState
          icon={<IconIntegrations className="h-6 w-6" />}
          title="Módulo en construcción"
          description="Las integraciones estarán disponibles cuando el API esté conectado."
          className="py-20"
        />
      </div>
    </div>
  );
}
