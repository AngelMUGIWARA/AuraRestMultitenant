import { SetMetadata } from '@nestjs/common';

export const AUTH_REFRESH_THROTTLE_KEY = 'auth-refresh-throttle';

/** Marca un endpoint para que aplique el throttler auth-refresh */
export const AuthRefreshThrottle = () =>
  SetMetadata(AUTH_REFRESH_THROTTLE_KEY, true);
