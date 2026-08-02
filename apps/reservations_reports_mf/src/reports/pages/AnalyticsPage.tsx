import { EmptyState, IconAnalytics } from '@maison/ui';
import { useBranchFilter } from '../hooks/useBranchFilter';

export default function AnalyticsPage() {
  const { branchId, isGlobal } = useBranchFilter();

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <header>
        <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">Analytics</h1>
        <p className="mt-1.5 text-sm text-maison-cream-muted">
          {isGlobal
            ? 'Reportes y métricas avanzadas de la plataforma'
            : `Reportes y métricas avanzadas — sucursal ${branchId}`}
        </p>
      </header>
      <div className="card">
        <EmptyState
          icon={<IconAnalytics className="h-6 w-6" />}
          title="Módulo en construcción"
          description="Los reportes estarán disponibles cuando el API esté conectado."
          className="py-20"
        />
      </div>
    </div>
  );
}
