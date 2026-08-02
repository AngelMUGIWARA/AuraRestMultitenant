'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AuthClient } from '@maison/auth-client';
import { apiClient } from '@maison/api-client';
import { ROLE_ROUTES } from '@/lib/constants';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!AuthClient.isAuthenticated()) {
      router.replace('/auth/login');
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsSubmitting(true);
    try {
      const email = AuthClient.getUser()?.email;

      await apiClient.post('/auth/change-password', { currentPassword, newPassword });

      // auth.service.ts revoca todas las refresh sessions del usuario al
      // cambiar contraseña (por seguridad) — el refreshToken actual ya no
      // sirve. Hay que loguearse de nuevo con la contraseña recién elegida
      // para obtener un access token fresco (con mustChangePassword=false).
      // apiClient sigue adjuntando x-tenant-slug automáticamente a partir
      // del access token viejo (todavía en localStorage en este punto).
      const loginData = await apiClient.post<{ accessToken: string; refreshToken: string }>('/auth/login', {
        email,
        password: newPassword,
      });
      AuthClient.setAccessToken(loginData.accessToken);
      AuthClient.setRefreshToken(loginData.refreshToken);

      const role = AuthClient.getRole();
      router.replace((role && ROLE_ROUTES[role]) || '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-1">
          <h1 className="font-display text-4xl font-semibold tracking-wide text-maison-cream">Maison</h1>
          <p className="text-sm text-maison-cream-muted">Debes cambiar tu contraseña temporal para continuar</p>
        </div>

        <div className="card p-8 space-y-6">
          <h2 className="text-lg font-medium text-maison-cream">Cambiar contraseña</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-maison-cream-dim uppercase tracking-wider">
                Contraseña actual (temporal)
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-maison-cream focus:outline-none focus:border-maison-amber/50 focus:ring-1 focus:ring-maison-amber/30 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-maison-cream-dim uppercase tracking-wider">
                Nueva contraseña
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-maison-cream focus:outline-none focus:border-maison-amber/50 focus:ring-1 focus:ring-maison-amber/30 transition"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-maison-cream-dim uppercase tracking-wider">
                Confirmar nueva contraseña
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-maison-cream focus:outline-none focus:border-maison-amber/50 focus:ring-1 focus:ring-maison-amber/30 transition"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-maison-ruby/10 border border-maison-ruby/30 px-3 py-2">
                <p className="text-xs text-maison-ruby">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-maison-amber text-surface-0 font-medium text-sm rounded-lg py-2.5 hover:bg-maison-amber/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
