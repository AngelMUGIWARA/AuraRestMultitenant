import { useState, type FormEvent } from 'react';
import { type AuthUser, ROLE_ROUTES } from '@maison/types';
import { useLogin } from '../hooks/useLogin';

function friendlyError(raw: string | null): string | null {
  if (!raw) return null;
  if (/401|unauthorized|invalid|credenciales/i.test(raw)) return 'Correo o contraseña incorrectos.';
  return raw;
}

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

  const displayError = friendlyError(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 px-4 py-12">
      <div className="w-full max-w-md space-y-10">

        {/* Brand */}
        <div className="text-center space-y-2">
          <h1 className="font-display text-4xl font-semibold tracking-wide text-maison-cream">
            Maison
          </h1>
          <p className="text-sm text-maison-cream-muted tracking-wide">
            Gestión inteligente para tu restaurante
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-1 border border-maison-border rounded-xl shadow-[0_2px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_24px_rgba(0,0,0,0.3)] px-8 py-8 space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-maison-cream">Iniciar sesión</h2>
            <p className="text-sm text-maison-cream-muted">Ingresa tus credenciales para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4.5">

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-xs font-medium text-maison-cream-dim uppercase tracking-wider">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-maison-cream-muted pointer-events-none">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
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
                  className="w-full bg-surface-2 border border-maison-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-maison-cream placeholder:text-maison-cream-dim/60 focus:outline-none focus:border-maison-amber/60 focus:ring-2 focus:ring-maison-amber/20 transition"
                  placeholder="nombre@restaurante.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-xs font-medium text-maison-cream-dim uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-maison-cream-muted pointer-events-none">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
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
                  className="w-full bg-surface-2 border border-maison-border rounded-lg pl-10 pr-11 py-2.5 text-sm text-maison-cream placeholder:text-maison-cream-dim/60 focus:outline-none focus:border-maison-amber/60 focus:ring-2 focus:ring-maison-amber/20 transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-maison-cream-dim hover:text-maison-cream transition"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {displayError && (
              <div className="flex items-start gap-2.5 rounded-lg bg-maison-ruby/10 border border-maison-ruby/25 px-3.5 py-2.5">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-maison-ruby" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-maison-ruby">{displayError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-maison-amber text-surface-0 font-semibold text-sm rounded-lg py-3 hover:bg-maison-amber-light active:scale-[0.985] transition-all focus:outline-none focus:ring-2 focus:ring-maison-amber/50 focus:ring-offset-2 focus:ring-offset-surface-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Entrando…
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="text-center pt-1">
            <a
              href="/auth/forgot-password"
              className="text-xs text-maison-cream-dim hover:text-maison-cream transition"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
