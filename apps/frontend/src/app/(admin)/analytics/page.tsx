import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconAnalytics } from '@/components/ui/Icons';

export const metadata: Metadata = { title: 'Analytics' };

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <header>
        <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">
          Analytics
        </h1>
        <p className="mt-1.5 text-sm text-maison-cream-muted">
          Reportes y métricas avanzadas de la plataforma
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
