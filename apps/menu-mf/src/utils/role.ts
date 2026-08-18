import { AuthClient } from '@maison/auth-client';

export function getRole(): string | null {
  if (typeof window === 'undefined') return null;
  return AuthClient.getRole();
}

export function useRole(): string | null {
  return getRole();
}
