import { useState } from 'react';
import { AuthClient } from '@maison/auth-client';
import { emit } from '@maison/event-bus';
import { authService } from '../services/auth.service';

interface LoginForm {
  email: string;
  password: string;
}

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(form: LoginForm, onSuccess?: () => void) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(form);
      AuthClient.setToken(response.data.accessToken);
      AuthClient.setRefreshToken(response.data.refreshToken);
      emit('auth:login', { user: response.data.user, token: response.data.accessToken });
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Credenciales inválidas';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return { login, isLoading, error };
}
