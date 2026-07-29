'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { systemAdminAuthService } from '@/services/system-admin-auth.service';
import { SystemAdminSession } from '@/lib/system-admin-session';

export default function SystemAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen flex items-center justify-center bg-surface-0 px-4">
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
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-maison-cream placeholder:text-maison-cream-muted focus:outline-none focus:border-maison-amber/50 focus:ring-1 focus:ring-maison-amber/30 transition"
                placeholder="••••••••"
              />
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
