import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconUsers } from '@/components/ui/Icons';

export const metadata: Metadata = { title: 'Usuarios' };

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <header>
        <h1 className="font-display text-3xl font-medium text-maison-cream leading-none">
          Usuarios
        </h1>
        <p className="mt-1.5 text-sm text-maison-cream-muted">
          Gestión de usuarios y roles del sistema
        </p>
      </header>
      <div className="card">
        <EmptyState
          icon={<IconUsers className="h-6 w-6" />}
          title="Módulo en construcción"
          description="La gestión de usuarios estará disponible cuando el API esté conectado."
          className="py-20"
        />
      </div>
    </div>
  );
}
