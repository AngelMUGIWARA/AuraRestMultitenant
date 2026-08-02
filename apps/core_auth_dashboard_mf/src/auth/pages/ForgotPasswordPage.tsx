import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth.service';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar el correo');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display text-4xl font-semibold tracking-wide text-maison-cream">
            Maison
          </h1>
        </div>

        <div className="card p-8 space-y-6">
          {sent ? (
            <div className="text-center space-y-3">
              <p className="text-maison-cream font-medium">Correo enviado</p>
              <p className="text-sm text-maison-cream-muted">
                Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
              </p>
              <Link
                to="/auth/login"
                className="text-xs text-maison-amber hover:underline"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-medium text-maison-cream">Recuperar contraseña</h2>
                <p className="text-xs text-maison-cream-muted">
                  Ingresa tu correo y te enviaremos un enlace de recuperación.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-maison-cream focus:outline-none focus:border-maison-amber/50 transition"
                  placeholder="nombre@restaurante.com"
                />
                {error && (
                  <p className="text-xs text-maison-ruby">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-maison-amber text-surface-0 font-medium text-sm rounded-lg py-2.5 hover:bg-maison-amber/90 transition disabled:opacity-50"
                >
                  {isLoading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>

              <div className="text-center">
                <Link
                  to="/auth/login"
                  className="text-xs text-maison-cream-muted hover:text-maison-cream transition"
                >
                  ← Volver al inicio de sesión
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
