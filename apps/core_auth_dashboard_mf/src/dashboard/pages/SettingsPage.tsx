import { EmptyState, IconSettings } from '@maison/ui';
import { VoiceSeedForm } from '../components/settings/VoiceSeedForm';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-7 animate-fade-in">
      <header>
        <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">Alexa Skill</h1>
        <p className="mt-1.5 text-sm text-maison-cream-muted">Configura tu identidad de voz e integración con Alexa</p>
      </header>
      <div className="card p-6">
        <VoiceSeedForm />
      </div>
    </div>
  );
}
