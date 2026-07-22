import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLogin } from '../../hooks/useLogin';
import { authService } from '../../services/auth.service';
import { AuthClient } from '@maison/auth-client';
import { emit } from '@maison/event-bus';

vi.mock('../../services/auth.service', () => ({
  authService: { login: vi.fn() },
}));

vi.mock('@maison/auth-client', () => ({
  AuthClient: {
    setToken: vi.fn(),
    setRefreshToken: vi.fn(),
  },
}));

vi.mock('@maison/event-bus', () => ({
  emit: vi.fn(),
}));

const mockLogin = vi.mocked(authService.login);
const mockSetToken = vi.mocked(AuthClient.setToken);
const mockSetRefreshToken = vi.mocked(AuthClient.setRefreshToken);
const mockEmit = vi.mocked(emit);

const mockResponse = {
  user: { id: '1', email: 'admin@demo.com', role: 'ADMIN', name: 'Admin' },
  accessToken: 'access-123',
  refreshToken: 'refresh-456',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useLogin', () => {
  it('returns initial state: isLoading=false, error=null', () => {
    const { result } = renderHook(() => useLogin());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe('successful login', () => {
    it('calls authService.login with email, password and tenantSlug', async () => {
      mockLogin.mockResolvedValueOnce(mockResponse as never);
      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.login({
          email: 'admin@demo.com',
          password: 'Admin123',
          tenantSlug: 'demo',
        });
      });

      expect(mockLogin).toHaveBeenCalledOnce();
      expect(mockLogin).toHaveBeenCalledWith(
        { email: 'admin@demo.com', password: 'Admin123' },
        'demo',
      );
    });

    it('stores accessToken and refreshToken via AuthClient', async () => {
      mockLogin.mockResolvedValueOnce(mockResponse as never);
      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.login({
          email: 'a@b.com',
          password: 'pass',
          tenantSlug: 't',
        });
      });

      expect(mockSetToken).toHaveBeenCalledWith('access-123');
      expect(mockSetRefreshToken).toHaveBeenCalledWith('refresh-456');
    });

    it('emits auth:login event with user and token', async () => {
      mockLogin.mockResolvedValueOnce(mockResponse as never);
      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.login({
          email: 'a@b.com',
          password: 'pass',
          tenantSlug: 't',
        });
      });

      expect(mockEmit).toHaveBeenCalledOnce();
      expect(mockEmit).toHaveBeenCalledWith('auth:login', {
        user: mockResponse.user,
        token: 'access-123',
      });
    });

    it('calls onSuccess callback with the user', async () => {
      mockLogin.mockResolvedValueOnce(mockResponse as never);
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.login(
          { email: 'a@b.com', password: 'pass', tenantSlug: 't' },
          onSuccess,
        );
      });

      expect(onSuccess).toHaveBeenCalledOnce();
      expect(onSuccess).toHaveBeenCalledWith(mockResponse.user);
    });

    it('sets isLoading to false after completion', async () => {
      mockLogin.mockResolvedValueOnce(mockResponse as never);
      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.login({
          email: 'a@b.com',
          password: 'pass',
          tenantSlug: 't',
        });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('clears error on new login attempt', async () => {
      mockLogin
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(mockResponse as never);
      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.login({
          email: 'a@b.com',
          password: 'pass',
          tenantSlug: 't',
        });
      });
      expect(result.current.error).toBe('First error');

      await act(async () => {
        await result.current.login({
          email: 'a@b.com',
          password: 'pass',
          tenantSlug: 't',
        });
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('failed login', () => {
    it('sets error message when Error is thrown', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Credenciales inválidas'));
      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.login({
          email: 'a@b.com',
          password: 'bad',
          tenantSlug: 't',
        });
      });

      expect(result.current.error).toBe('Credenciales inválidas');
    });

    it('sets fallback message when non-Error is thrown', async () => {
      mockLogin.mockRejectedValueOnce('string error');
      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.login({
          email: 'a@b.com',
          password: 'bad',
          tenantSlug: 't',
        });
      });

      expect(result.current.error).toBe('Credenciales inválidas');
    });

    it('does NOT call onSuccess on error', async () => {
      mockLogin.mockRejectedValueOnce(new Error('fail'));
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.login(
          { email: 'a@b.com', password: 'bad', tenantSlug: 't' },
          onSuccess,
        );
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('does NOT store tokens on error', async () => {
      mockLogin.mockRejectedValueOnce(new Error('fail'));
      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.login({
          email: 'a@b.com',
          password: 'bad',
          tenantSlug: 't',
        });
      });

      expect(mockSetToken).not.toHaveBeenCalled();
      expect(mockSetRefreshToken).not.toHaveBeenCalled();
    });

    it('does NOT emit auth:login on error', async () => {
      mockLogin.mockRejectedValueOnce(new Error('fail'));
      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.login({
          email: 'a@b.com',
          password: 'bad',
          tenantSlug: 't',
        });
      });

      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('sets isLoading to false even on error', async () => {
      mockLogin.mockRejectedValueOnce(new Error('fail'));
      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.login({
          email: 'a@b.com',
          password: 'bad',
          tenantSlug: 't',
        });
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('loading state lifecycle', () => {
    it('sets isLoading=true during the async call', async () => {
      let resolveLogin!: (v: typeof mockResponse) => void;
      mockLogin.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveLogin = resolve;
        }) as never,
      );
      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.login({
          email: 'a@b.com',
          password: 'pass',
          tenantSlug: 't',
        });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveLogin(mockResponse);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('without onSuccess callback', () => {
    it('does not throw when no callback is provided', async () => {
      mockLogin.mockResolvedValueOnce(mockResponse as never);
      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.login({
          email: 'a@b.com',
          password: 'pass',
          tenantSlug: 't',
        });
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
