import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import {
  AUTH_REFRESH_THROTTLE_KEY,
} from '../common/decorators/auth-refresh-throttle.decorator';

export function createThrottlerOptions(
  config: ConfigService,
  reflector: Reflector,
): ThrottlerModuleOptions {
  return [
    {
      ttl: 60000,
      limit: 60,
    },
    {
      name: 'auth-refresh',
      ttl: config.getOrThrow<number>('AUTH_REFRESH_THROTTLE_TTL_MS'),
      limit: config.getOrThrow<number>('AUTH_REFRESH_THROTTLE_LIMIT'),
      skipIf: (context: ExecutionContext) => {
        const marked = reflector.getAllAndOverride<boolean>(
          AUTH_REFRESH_THROTTLE_KEY,
          [context.getHandler(), context.getClass()],
        );
        return !marked;
      },
    },
  ];
}
