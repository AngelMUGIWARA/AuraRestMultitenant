'use client';

import { EmptyState } from '@maison/ui';
import { IconIntegrations } from '@maison/ui';

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-medium leading-none text-maison-cream">
          Integraciones
        </h1>
        <p className="mt-1.5 text-sm text-maison-cream-muted">
          Conecta sistemas externos con tu plataforma
        </p>
      </header>

      <div className="card">
        <EmptyState
          icon={<IconIntegrations className="h-6 w-6" />}
          title="Integraciones"
          description="Las integraciones con servicios externos están siendo configuradas. Pronto podrás conectar pasarelas de pago, sistemas de reportes, y más."
          className="py-20"
        />
      </div>
    </div>
  );
}