import { EmptyState } from '@maison/ui';
import { IconTenants } from '@maison/ui';
export default function TenantsPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <header><h1 className="font-display text-3xl font-medium text-maison-cream leading-none">Tenants</h1><p className="mt-1.5 text-sm text-maison-cream-muted">Gestión de tenants de la plataforma</p></header>
      <div className="card"><EmptyState icon={<IconTenants className="h-6 w-6" />} title="Módulo en construcción" description="La gestión de tenants estará disponible cuando el API esté conectado." className="py-20" /></div>
    </div>
  );
}
