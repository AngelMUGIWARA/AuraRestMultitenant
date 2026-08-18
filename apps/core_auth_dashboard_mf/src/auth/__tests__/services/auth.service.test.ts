import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@maison/api-client';

vi.mock('@maison/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { authService } from '../../services/auth.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authService', () => {
  const mockPost = vi.mocked(apiClient.post);

  describe('login', () => {
    it('calls apiClient.post with correct endpoint, payload, and tenant header', async () => {
      const payload = { email: 'owner@demo.com', password: 'Owner123' };
      const tenantSlug = 'demo';
      const expectedResponse = {
        user: { id: '1', email: 'owner@demo.com', role: 'OWNER' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      mockPost.mockResolvedValueOnce(expectedResponse);

      const result = await authService.login(payload, tenantSlug);

      expect(mockPost).toHaveBeenCalledOnce();
      expect(mockPost).toHaveBeenCalledWith('/auth/login', payload, {
        headers: { 'x-tenant-slug': tenantSlug },
      });
      expect(result).toEqual(expectedResponse);
    });

    it('propagates errors from apiClient', async () => {
      mockPost.mockRejectedValueOnce(new Error('Invalid credentials'));
      await expect(
        authService.login({ email: 'x@y.com', password: 'bad' }, 'tenant'),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('calls apiClient.post with /auth/logout and empty body', async () => {
      mockPost.mockResolvedValueOnce(undefined);

      await authService.logout();

      expect(mockPost).toHaveBeenCalledOnce();
      expect(mockPost).toHaveBeenCalledWith('/auth/logout', {});
    });
  });

  describe('refreshToken', () => {
    it('calls apiClient.post with /auth/refresh and token payload', async () => {
      const refreshToken = 'old-refresh-token';
      const expected = { accessToken: 'new-access-token' };
      mockPost.mockResolvedValueOnce(expected);

      const result = await authService.refreshToken(refreshToken);

      expect(mockPost).toHaveBeenCalledOnce();
      expect(mockPost).toHaveBeenCalledWith('/auth/refresh', { refreshToken });
      expect(result).toEqual(expected);
    });
  });

  describe('forgotPassword', () => {
    it('calls apiClient.post with /auth/forgot-password and email', async () => {
      mockPost.mockResolvedValueOnce(undefined);

      await authService.forgotPassword('user@example.com');

      expect(mockPost).toHaveBeenCalledOnce();
      expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'user@example.com',
      });
    });
  });

  describe('resetPassword', () => {
    it('calls apiClient.post with /auth/reset-password and token+password', async () => {
      mockPost.mockResolvedValueOnce(undefined);

      await authService.resetPassword('reset-token-abc', 'NewPass123');

      expect(mockPost).toHaveBeenCalledOnce();
      expect(mockPost).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'reset-token-abc',
        password: 'NewPass123',
      });
    });
  });
});
