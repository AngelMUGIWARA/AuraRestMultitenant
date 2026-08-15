import { useState } from 'react';
import { AuthClient } from '@maison/auth-client';
import { emit } from '@maison/event-bus';
import type { AuthUser } from '@maison/types';
import { authService } from '../services/auth.service';

interface LoginForm {
  email: string;
  password: string;
}

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(form: LoginForm, onSuccess?: (user: AuthUser) => void) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(form);
      AuthClient.setToken(response.accessToken);
      AuthClient.setRefreshToken(response.refreshToken);
      emit('auth:login', { user: response.user, token: response.accessToken });
      onSuccess?.(response.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Credenciales inválidas';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return { login, isLoading, error };
}
