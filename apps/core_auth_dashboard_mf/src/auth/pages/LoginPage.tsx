import { useState, type FormEvent } from 'react';
import { type AuthUser, ROLE_ROUTES } from '@maison/types';
import { useLogin } from '../hooks/useLogin';

/* ─── helpers ─────────────────────────────────────────────────── */

function friendlyError(raw: string | null): string | null {
  if (!raw) return null;
  if (/inactiv|suspendid/i.test(raw))
    return 'Tu cuenta está inactiva o suspendida. Contacta a un administrador.';
  if (/401|unauthorized|invalid|credenciales/i.test(raw))
    return 'Correo o contraseña incorrectos.';
  if (/network|fetch|ECONNREFUSED/i.test(raw))
    return 'No se pudo conectar al servidor. Intenta de nuevo.';
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}

/* ─── component ───────────────────────────────────────────────── */

export default function LoginPage() {
  const { login, isLoading, error } = useLogin();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function handleSuccess(user: AuthUser) {
    const route = ROLE_ROUTES[user.role] ?? '/dashboard';
    window.location.replace(route);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    await login({ email, password }, handleSuccess);
  }

  const displayError = friendlyError(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 px-4 py-12">
      <div className="w-full max-w-md space-y-8">

        {/* ── Brand ── */}
        <div className="text-center space-y-2">
          {/* Monogram badge */}
          <div
            className="mx-auto mb-1 flex items-center justify-center rounded-xl bg-maison-amber text-white font-display font-semibold text-xl tracking-wide"
            style={{ width: 44, height: 44 }}
            aria-hidden="true"
          >
            M
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-wide text-maison-cream">
            Maison
          </h1>
          <p className="text-sm text-maison-cream-muted tracking-wide">
            Gestión inteligente para tu restaurante
          </p>
        </div>

        {/* ── Card ── */}
        <div className="bg-surface-1 border border-maison-border rounded-2xl px-8 py-8 space-y-6"
             style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.07)' }}>

          {/* Card header */}
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-maison-cream">
              Iniciar sesión
            </h2>
            <p className="text-sm text-maison-cream-muted">
              Ingresa tus credenciales para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* ── Email ── */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-maison-cream-dim uppercase tracking-widest"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-maison-cream-dim">
                  <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </span>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-surface-2 border border-maison-border rounded-xl pl-10 pr-4 py-3 text-sm text-maison-cream placeholder:text-maison-cream-dim/50 focus:outline-none focus:border-maison-amber focus:ring-2 focus:ring-maison-amber/20 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="nombre@restaurante.com"
                />
              </div>
            </div>

            {/* ── Password ── */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-maison-cream-dim uppercase tracking-widest"
              >
                Contraseña
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-maison-cream-dim">
                  <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-surface-2 border border-maison-border rounded-xl pl-10 pr-12 py-3 text-sm text-maison-cream placeholder:text-maison-cream-dim/50 focus:outline-none focus:border-maison-amber focus:ring-2 focus:ring-maison-amber/20 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-maison-cream-dim hover:text-maison-cream transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-maison-amber rounded-r-xl"
                >
                  {showPassword ? (
                    <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* ── Error ── */}
            {displayError && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm bg-maison-ruby/8 border-maison-ruby/20 text-maison-ruby"
              >
                <svg style={{ width: 15, height: 15, flexShrink: 0, marginTop: 2 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{displayError}</span>
              </div>
            )}

            {/* ── Submit ── */}
            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold tracking-wide transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-maison-amber focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1 active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              style={{
                backgroundColor: 'rgb(var(--color-accent))',
                color: '#fff',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgb(var(--color-accent-light))';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgb(var(--color-accent))';
              }}
            >
              {isLoading ? (
                <>
                  <svg
                    style={{ width: 16, height: 16, flexShrink: 0, animation: 'spin 0.75s linear infinite' }}
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Entrando…</span>
                </>
              ) : (
                <span>Entrar</span>
              )}
            </button>
          </form>

          {/* ── Forgot password ── */}
          <div className="text-center">
            <a
              href="/auth/forgot-password"
              className="text-xs text-maison-cream-dim hover:text-maison-cream-muted transition"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>
      </div>

      {/* Inline keyframe for spinner — no Tailwind dependency */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
