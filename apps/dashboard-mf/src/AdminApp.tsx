import { AuthClient } from '@maison/auth-client';

function IconConstruction({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2 20h20M6 20V10l6-6 6 6v10M10 20v-5h4v5" />
    </svg>
  );
}

export default function AdminApp() {
  const role = AuthClient.getRole() ?? 'ADMIN';

  function handleLogout() {
    AuthClient.clearToken();
    window.location.replace('/auth/login');
  }

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      <header className="h-[60px] border-b border-maison-border bg-surface-1 flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[7px]"
            style={{ background: 'linear-gradient(140deg, rgb(var(--color-accent-dim)) 0%, rgb(var(--color-accent)) 100%)' }}>
            <span className="font-display text-lg font-medium italic leading-none text-white">M</span>
          </div>
          <span className="font-display text-[17px] font-medium text-maison-cream">Maison</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-maison-amber px-2 py-0.5 rounded border border-maison-amber/30 bg-maison-amber-glow">
            {role}
          </span>
          <button type="button" onClick={handleLogout}
            className="text-xs text-maison-cream-muted hover:text-maison-cream transition-colors">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="text-center space-y-5 max-w-sm">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-maison-border bg-surface-2">
              <IconConstruction className="h-8 w-8 text-maison-amber" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-medium text-maison-cream">
              Panel de Administrador
            </h1>
            <p className="text-sm text-maison-cream-muted">
              Esta sección está en construcción. Pronto tendrás acceso a la gestión completa del restaurante.
            </p>
          </div>
          <div className="rounded-lg border border-maison-border bg-surface-1 px-4 py-3 text-left space-y-1">
            <p className="text-2xs font-semibold uppercase tracking-widest text-maison-cream-dim">Próximamente</p>
            {['Gestión de usuarios', 'Control de menús', 'Pedidos y cocina', 'Reportes operativos'].map((item) => (
              <p key={item} className="text-xs text-maison-cream-muted flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-maison-amber flex-shrink-0" />
                {item}
              </p>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
