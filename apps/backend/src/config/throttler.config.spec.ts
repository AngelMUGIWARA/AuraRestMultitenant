import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createThrottlerOptions } from './throttler.config';
import { AUTH_REFRESH_THROTTLE_KEY } from '../common/decorators/auth-refresh-throttle.decorator';

function mockConfig(overrides?: Record<string, unknown>): ConfigService {
  const defaults: Record<string, unknown> = {
    AUTH_REFRESH_THROTTLE_LIMIT: 10,
    AUTH_REFRESH_THROTTLE_TTL_MS: 60000,
    ...overrides,
  };
  return {
    getOrThrow<T>(key: string): T {
      if (!(key in defaults)) throw new Error(`Missing key: ${key}`);
      return defaults[key] as T;
    },
  } as unknown as ConfigService;
}

function mockReflector(): Reflector {
  return {
    getAllAndOverride: <T>(key: string, targets: unknown[]): T | undefined => {
      for (const target of targets) {
        const meta = Reflect.getMetadata(key, target as object);
        if (meta !== undefined) return meta as T;
      }
      return undefined;
    },
  } as unknown as Reflector;
}

function ctx(handlerName: string): ExecutionContext {
  const handler = () => {};
  Object.defineProperty(handler, 'name', { value: handlerName });
  return {
    getHandler: () => handler,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('createThrottlerOptions', () => {
  it('returns an array of two throttlers', () => {
    const options = createThrottlerOptions(mockConfig(), mockReflector());
    expect(Array.isArray(options)).toBe(true);
    expect(options).toHaveLength(2);
  });

  it('first throttler is the global default (60 req / 60s)', () => {
    const options = createThrottlerOptions(mockConfig(), mockReflector());
    const first = options[0];
    expect(first.name ?? 'default').toBe('default');
    expect(first.ttl).toBe(60000);
    expect(first.limit).toBe(60);
    expect(first.skipIf).toBeUndefined();
  });

  it('second throttler is auth-refresh with values from ConfigService', () => {
    const options = createThrottlerOptions(mockConfig(), mockReflector());
    const second = options[1];
    expect(second.name).toBe('auth-refresh');
    expect(second.limit).toBe(10);
    expect(second.ttl).toBe(60000);
    expect(typeof second.skipIf).toBe('function');
  });

  it('reflects custom env values from ConfigService', () => {
    const options = createThrottlerOptions(
      mockConfig({
        AUTH_REFRESH_THROTTLE_LIMIT: 20,
        AUTH_REFRESH_THROTTLE_TTL_MS: 30000,
      }),
      mockReflector(),
    );
    const second = options[1];
    expect(second.limit).toBe(20);
    expect(second.ttl).toBe(30000);
  });

  it('throws when ConfigService is missing required keys', () => {
    const emptyConfig = {
      getOrThrow: () => {
        throw new Error('Missing configuration');
      },
    } as unknown as ConfigService;
    expect(() => createThrottlerOptions(emptyConfig, mockReflector())).toThrow();
  });

  describe('auth-refresh skipIf (Reflector-based)', () => {
    it('returns false when AUTH_REFRESH_THROTTLE_KEY metadata is present', () => {
      const reflector = mockReflector();
      const options = createThrottlerOptions(mockConfig(), reflector);
      const skipIf = options[1].skipIf!;

      const handler = () => {};
      Reflect.defineMetadata(AUTH_REFRESH_THROTTLE_KEY, true, handler);
      const context = {
        getHandler: () => handler,
        getClass: () => class {},
      } as unknown as ExecutionContext;

      expect(skipIf(context)).toBe(false);
    });

    it('returns true when AUTH_REFRESH_THROTTLE_KEY metadata is absent', () => {
      const reflector = mockReflector();
      const options = createThrottlerOptions(mockConfig(), reflector);
      const skipIf = options[1].skipIf!;

      const context = ctx('login');
      expect(skipIf(context)).toBe(true);
    });

    it('returns true for logout (no metadata)', () => {
      const reflector = mockReflector();
      const options = createThrottlerOptions(mockConfig(), reflector);
      const skipIf = options[1].skipIf!;

      expect(skipIf(ctx('logout'))).toBe(true);
    });

    it('returns true for changePassword (no metadata)', () => {
      const reflector = mockReflector();
      const options = createThrottlerOptions(mockConfig(), mockReflector());
      const skipIf = options[1].skipIf!;

      expect(skipIf(ctx('changePassword'))).toBe(true);
    });

    it('returns true for voiceLogin (no metadata)', () => {
      const reflector = mockReflector();
      const options = createThrottlerOptions(mockConfig(), reflector);
      const skipIf = options[1].skipIf!;

      expect(skipIf(ctx('voiceLogin'))).toBe(true);
    });

    it('does not depend on handler name — a handler named "refresh" without metadata is skipped', () => {
      const reflector = mockReflector();
      const options = createThrottlerOptions(mockConfig(), reflector);
      const skipIf = options[1].skipIf!;

      expect(skipIf(ctx('refresh'))).toBe(true);
    });

    it('a handler named differently with metadata is NOT skipped', () => {
      const reflector = mockReflector();
      const options = createThrottlerOptions(mockConfig(), reflector);
      const skipIf = options[1].skipIf!;

      const handler = () => {};
      Object.defineProperty(handler, 'name', { value: 'customRefreshEndpoint' });
      Reflect.defineMetadata(AUTH_REFRESH_THROTTLE_KEY, true, handler);
      const context = {
        getHandler: () => handler,
        getClass: () => class {},
      } as unknown as ExecutionContext;

      expect(skipIf(context)).toBe(false);
    });
  });
});
