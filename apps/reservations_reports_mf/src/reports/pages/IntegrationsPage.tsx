import { EmptyState, IconIntegrations } from '@maison/ui';
import { useBranchFilter } from '../hooks/useBranchFilter';

export default function IntegrationsPage() {
  const { branchId, isGlobal } = useBranchFilter();

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <header>
        <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">Integraciones</h1>
        <p className="mt-1.5 text-sm text-maison-cream-muted">
          {isGlobal
            ? 'Conexiones con servicios externos'
            : `Conexiones con servicios externos — sucursal ${branchId}`}
        </p>
      </header>
      <div className="card">
        <EmptyState
          icon={<IconIntegrations className="h-6 w-6" />}
          title="Módulo en construcción"
          description="Las integraciones estarán disponibles próximamente."
          className="py-20"
        />
      </div>
    </div>
  );
}
