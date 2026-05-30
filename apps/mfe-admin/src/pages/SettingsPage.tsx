import { EmptyState } from '@maison/ui';
import { IconSettings } from '@maison/ui';
export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <header><h1 className="font-display text-3xl font-medium text-maison-cream leading-none">Configuración</h1><p className="mt-1.5 text-sm text-maison-cream-muted">Ajustes de la plataforma</p></header>
      <div className="card"><EmptyState icon={<IconSettings className="h-6 w-6" />} title="Módulo en construcción" description="La configuración estará disponible próximamente." className="py-20" /></div>
    </div>
  );
}
