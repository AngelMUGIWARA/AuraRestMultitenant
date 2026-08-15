import { API_BASE_URL } from '@/lib/constants';
import type { SuperAdminLoginPayload, SuperAdminAuthResponse } from '@maison/types';

export const systemAdminAuthService = {
  async login(payload: SuperAdminLoginPayload): Promise<SuperAdminAuthResponse> {
    const res = await fetch(`${API_BASE_URL}/system-admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Credenciales inválidas' }));
      throw new Error(body.message ?? 'Credenciales inválidas');
    }

    return res.json();
  },
};
