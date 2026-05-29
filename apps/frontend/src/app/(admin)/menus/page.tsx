import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconMenus } from '@/components/ui/Icons';

export const metadata: Metadata = { title: 'Menús' };

export default function MenusPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <header>
        <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">
          Menús
        </h1>
        <p className="mt-1.5 text-sm text-maison-cream-muted">
          Gestión de menús y catálogos de productos
        </p>
      </header>
      <div className="card">
        <EmptyState
          icon={<IconMenus className="h-6 w-6" />}
          title="Módulo en construcción"
          description="La gestión de menús estará disponible cuando el API esté conectado."
          className="py-20"
        />
      </div>
    </div>
  );
}
