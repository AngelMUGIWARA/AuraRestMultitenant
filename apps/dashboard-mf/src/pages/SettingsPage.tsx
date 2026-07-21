import { EmptyState, IconSettings } from '@maison/ui';
import { VoiceSeedForm } from '../components/settings/VoiceSeedForm';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-7 animate-fade-in">
      <header>
        <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">Configuración</h1>
        <p className="mt-1.5 text-sm text-maison-cream-muted">Ajustes generales de la plataforma</p>
      </header>
      <div className="card p-6">
        <VoiceSeedForm />
      </div>
      <div className="card">
        <EmptyState icon={<IconSettings className="h-6 w-6" />} title="En construcción" description="La sección de configuración estará disponible próximamente." className="py-24" />
      </div>
    </div>
  );
}
