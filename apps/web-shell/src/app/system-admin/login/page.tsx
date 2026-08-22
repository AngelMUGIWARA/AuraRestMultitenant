'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { systemAdminAuthService } from '@/services/system-admin-auth.service';
import { SystemAdminSession } from '@/lib/system-admin-session';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function SystemAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await systemAdminAuthService.login({ email, password });
      SystemAdminSession.setAccessToken(res.accessToken);
      SystemAdminSession.setRefreshToken(res.refreshToken);
      router.replace('/system-admin/tenants');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenciales inválidas');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-surface-0 px-4">
      <Link
        href="/auth/login"
        className="absolute left-4 top-4 flex items-center gap-1.5 rounded border border-maison-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-maison-cream-muted transition-colors hover:bg-surface-3 hover:text-maison-cream"
      >
        <svg style={{ width: 14, height: 14, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        <span>Regresar</span>
      </Link>
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-1">
          <h1 className="font-display text-4xl font-semibold tracking-wide text-maison-cream">Maison</h1>
          <p className="text-sm text-maison-cream-muted">Panel de Super Admin — administración de la plataforma</p>
        </div>

        <div className="card p-8 space-y-6">
          <h2 className="text-lg font-medium text-maison-cream">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="superadmin@aurarest.dev"
              />
            </div>

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
                  className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 pr-11 text-sm text-maison-cream placeholder:text-maison-cream-muted focus:outline-none focus:border-maison-amber/50 focus:ring-1 focus:ring-maison-amber/30 transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-maison-cream-dim hover:text-maison-cream transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-maison-amber rounded-r-lg"
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

            {error && (
              <div className="rounded-lg bg-maison-ruby/10 border border-maison-ruby/30 px-3 py-2">
                <p className="text-xs text-maison-ruby">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-maison-amber text-surface-0 font-medium text-sm rounded-lg py-2.5 hover:bg-maison-amber/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verificando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
