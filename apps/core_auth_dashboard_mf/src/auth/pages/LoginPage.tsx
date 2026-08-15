import { useState, type FormEvent } from 'react';
import type { AuthUser } from '@maison/types';
import { useLogin } from '../hooks/useLogin';

const ROLE_ROUTES: Record<string, string> = {
  OWNER:         '/dashboard',
  MANAGER:       '/dashboard-admin',
  WAITER:        '/waiter/tables',
  CASHIER:       '/cashier',
  KITCHEN_STAFF: '/chef/dashboard',
};

export default function LoginPage() {
  const { login, isLoading, error } = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function handleSuccess(user: AuthUser) {
    const route = ROLE_ROUTES[user.role] ?? '/dashboard';
    window.location.replace(route);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await login({ email, password }, handleSuccess);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Brand */}
        <div className="text-center space-y-1">
          <h1 className="font-display text-4xl font-semibold tracking-wide text-maison-cream">
            Maison
          </h1>
          <p className="text-sm text-maison-cream-muted">
            Plataforma de administración multitenant
          </p>
        </div>

        {/* Card */}
        <div className="card p-8 space-y-6">
          <h2 className="text-lg font-medium text-maison-cream">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-maison-cream-dim uppercase tracking-wider">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-maison-cream placeholder:text-maison-cream-muted focus:outline-none focus:border-maison-amber/50 focus:ring-1 focus:ring-maison-amber/30 transition"
                placeholder="nombre@restaurante.com"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-maison-cream-dim uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 pr-10 py-2.5 text-sm text-maison-cream placeholder:text-maison-cream-muted focus:outline-none focus:border-maison-amber/50 focus:ring-1 focus:ring-maison-amber/30 transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-maison-cream-muted hover:text-maison-cream transition"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-maison-ruby/10 border border-maison-ruby/30 px-3 py-2">
                <p className="text-xs text-maison-ruby">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-maison-amber text-surface-0 font-medium text-sm rounded-lg py-2.5 hover:bg-maison-amber/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Verificando…
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Role hint — only in dev */}
          {import.meta.env.DEV && (
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 space-y-1.5">
              <p className="text-xs font-medium text-maison-cream-dim uppercase tracking-wider">Redirección por rol</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {Object.entries(ROLE_ROUTES).map(([role, route]) => (
                  <p key={role} className="text-xs text-maison-cream-muted">
                    <span className="text-maison-amber">{role}</span> → {route}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="text-center">
            <a
              href="/auth/forgot-password"
              className="text-xs text-maison-cream-muted hover:text-maison-cream transition"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
