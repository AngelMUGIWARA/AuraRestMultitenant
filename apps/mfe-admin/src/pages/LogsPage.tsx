import { EmptyState } from '@maison/ui';
import { IconLogs } from '@maison/ui';
export default function LogsPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <header><h1 className="font-display text-3xl font-medium text-maison-cream leading-none">Registros</h1><p className="mt-1.5 text-sm text-maison-cream-muted">Logs de actividad del sistema</p></header>
      <div className="card"><EmptyState icon={<IconLogs className="h-6 w-6" />} title="Módulo en construcción" description="Los registros estarán disponibles cuando el API esté conectado." className="py-20" /></div>
    </div>
  );
}
