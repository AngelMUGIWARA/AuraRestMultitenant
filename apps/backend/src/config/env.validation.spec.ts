import { validateEnv, InvalidEnvironmentError } from './env.validation';

function baseValid(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    NODE_ENV: 'development',
    JWT_SECRET: 'a'.repeat(40),
    JWT_REFRESH_SECRET: 'b'.repeat(40),
    JWT_EXPIRES_IN: '8h',
    JWT_REFRESH_EXPIRES_IN: '7d',
    ...overrides,
  };
}

describe('validateEnv', () => {
  it('accepts valid development config', () => {
    const result = validateEnv(baseValid());
    expect(result.JWT_SECRET).toBe('a'.repeat(40));
    expect(result.JWT_REFRESH_SECRET).toBe('b'.repeat(40));
  });

  it('accepts valid test config', () => {
    const result = validateEnv(baseValid({ NODE_ENV: 'test' }));
    expect(result.NODE_ENV).toBe('test');
  });

  it('accepts valid production config', () => {
    const result = validateEnv(
      baseValid({
        NODE_ENV: 'production',
        JWT_SECRET: 'c'.repeat(64),
        JWT_REFRESH_SECRET: 'd'.repeat(64),
      }),
    );
    expect(result.NODE_ENV).toBe('production');
  });

  describe('missing secrets', () => {
    it('fails when JWT_SECRET is missing', () => {
      const cfg = baseValid();
      delete cfg.JWT_SECRET;
      expect(() => validateEnv(cfg)).toThrow(InvalidEnvironmentError);
      expect(() => validateEnv(cfg)).toThrow('JWT_SECRET is required');
    });

    it('fails when JWT_REFRESH_SECRET is missing', () => {
      const cfg = baseValid();
      delete cfg.JWT_REFRESH_SECRET;
      expect(() => validateEnv(cfg)).toThrow(InvalidEnvironmentError);
      expect(() => validateEnv(cfg)).toThrow('JWT_REFRESH_SECRET is required');
    });

    it('reports both missing secrets in one error', () => {
      const cfg = baseValid();
      delete cfg.JWT_SECRET;
      delete cfg.JWT_REFRESH_SECRET;
      try {
        validateEnv(cfg);
        fail('should throw');
      } catch (e: unknown) {
        expect((e as Error).message).toContain('JWT_SECRET is required');
        expect((e as Error).message).toContain('JWT_REFRESH_SECRET is required');
      }
    });
  });

  describe('empty secrets', () => {
    it('fails when JWT_SECRET is empty string', () => {
      expect(() => validateEnv(baseValid({ JWT_SECRET: '' }))).toThrow(
        'JWT_SECRET must not be empty',
      );
    });

    it('fails when JWT_REFRESH_SECRET is empty string', () => {
      expect(() => validateEnv(baseValid({ JWT_REFRESH_SECRET: '' }))).toThrow(
        'JWT_REFRESH_SECRET must not be empty',
      );
    });

    it('fails when JWT_SECRET is only spaces', () => {
      expect(() => validateEnv(baseValid({ JWT_SECRET: '   ' }))).toThrow(
        'JWT_SECRET must not be empty',
      );
    });

    it('fails when JWT_REFRESH_SECRET is only spaces', () => {
      expect(() => validateEnv(baseValid({ JWT_REFRESH_SECRET: '    ' }))).toThrow(
        'JWT_REFRESH_SECRET must not be empty',
      );
    });
  });

  describe('secrets must be different', () => {
    it('fails when both secrets are identical', () => {
      const same = 'a'.repeat(40);
      expect(() =>
        validateEnv(baseValid({ JWT_SECRET: same, JWT_REFRESH_SECRET: same })),
      ).toThrow('JWT_SECRET must be different from JWT_REFRESH_SECRET');
    });

    it('accepts secrets that differ only by one character', () => {
      const a = 'a'.repeat(40);
      const b = 'a'.repeat(39) + 'b';
      const result = validateEnv(baseValid({ JWT_SECRET: a, JWT_REFRESH_SECRET: b }));
      expect(result.JWT_SECRET).toBe(a);
      expect(result.JWT_REFRESH_SECRET).toBe(b);
    });
  });

  describe('production length requirements', () => {
    const prodBase = () =>
      baseValid({
        NODE_ENV: 'production',
        JWT_SECRET: 'c'.repeat(64),
        JWT_REFRESH_SECRET: 'd'.repeat(64),
      });

    it('fails when JWT_SECRET is shorter than 32 chars in production', () => {
      expect(() =>
        validateEnv({ ...prodBase(), JWT_SECRET: 'a'.repeat(31) }),
      ).toThrow('JWT_SECRET is too short for production');
    });

    it('fails when JWT_REFRESH_SECRET is shorter than 32 chars in production', () => {
      expect(() =>
        validateEnv({ ...prodBase(), JWT_REFRESH_SECRET: 'b'.repeat(31) }),
      ).toThrow('JWT_REFRESH_SECRET is too short for production');
    });

    it('accepts secrets with exactly 32 chars in production', () => {
      const result = validateEnv({
        ...prodBase(),
        JWT_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32),
      });
      expect(result.JWT_SECRET).toBe('a'.repeat(32));
    });
  });

  describe('production placeholder rejection', () => {
    const prodBase = () =>
      baseValid({
        NODE_ENV: 'production',
        JWT_SECRET: 'c'.repeat(64),
        JWT_REFRESH_SECRET: 'd'.repeat(64),
      });

    it('rejects known placeholder in JWT_SECRET', () => {
      expect(() =>
        validateEnv({ ...prodBase(), JWT_SECRET: 'cambia_este_secreto' }),
      ).toThrow('JWT_SECRET is insecure for production');
    });

    it('rejects known placeholder in JWT_REFRESH_SECRET', () => {
      expect(() =>
        validateEnv({ ...prodBase(), JWT_REFRESH_SECRET: 'change_me' }),
      ).toThrow('JWT_REFRESH_SECRET is insecure for production');
    });

    it('rejects placeholder with different casing', () => {
      expect(() =>
        validateEnv({ ...prodBase(), JWT_SECRET: 'CHANGE_ME' }),
      ).toThrow('JWT_SECRET is insecure for production');
    });

    it('rejects placeholder with mixed separators', () => {
      expect(() =>
        validateEnv({ ...prodBase(), JWT_SECRET: 'change_Me' }),
      ).toThrow('JWT_SECRET is insecure for production');
    });

    it('rejects changeme', () => {
      expect(() =>
        validateEnv({ ...prodBase(), JWT_SECRET: 'changeme' }),
      ).toThrow('JWT_SECRET is insecure for production');
    });

    it('rejects secret', () => {
      expect(() =>
        validateEnv({ ...prodBase(), JWT_SECRET: 'secret' }),
      ).toThrow('JWT_SECRET is insecure for production');
    });

    it('rejects CAMBIAME_USA_UN_SECRETO_UNICO_AQUI', () => {
      expect(() =>
        validateEnv({
          ...prodBase(),
          JWT_SECRET: 'CAMBIAME_USA_UN_SECRETO_UNICO_AQUI',
        }),
      ).toThrow('JWT_SECRET is insecure for production');
    });
  });

  describe('placeholders allowed in development', () => {
    it('accepts placeholder JWT_SECRET in development', () => {
      const result = validateEnv(
        baseValid({ JWT_SECRET: 'CAMBIAME_USA_UN_SECRETO_UNICO_AQUI' }),
      );
      expect(result.JWT_SECRET).toBe('CAMBIAME_USA_UN_SECRETO_UNICO_AQUI');
    });

    it('accepts placeholder JWT_REFRESH_SECRET in development', () => {
      const result = validateEnv(
        baseValid({ JWT_REFRESH_SECRET: 'CAMBIAME_USA_OTRO_SECRETO_UNICO_AQUI' }),
      );
      expect(result.JWT_REFRESH_SECRET).toBe(
        'CAMBIAME_USA_OTRO_SECRETO_UNICO_AQUI',
      );
    });
  });

  describe('expiry validation', () => {
    it('sets default JWT_EXPIRES_IN when undefined', () => {
      const cfg = baseValid();
      delete cfg.JWT_EXPIRES_IN;
      const result = validateEnv(cfg);
      expect(result.JWT_EXPIRES_IN).toBe('8h');
    });

    it('sets default JWT_REFRESH_EXPIRES_IN when undefined', () => {
      const cfg = baseValid();
      delete cfg.JWT_REFRESH_EXPIRES_IN;
      const result = validateEnv(cfg);
      expect(result.JWT_REFRESH_EXPIRES_IN).toBe('7d');
    });

    it('fails when JWT_EXPIRES_IN is empty string', () => {
      expect(() => validateEnv(baseValid({ JWT_EXPIRES_IN: '' }))).toThrow(
        'JWT_EXPIRES_IN must not be empty',
      );
    });

    it('fails when JWT_REFRESH_EXPIRES_IN is empty string', () => {
      expect(() =>
        validateEnv(baseValid({ JWT_REFRESH_EXPIRES_IN: '' })),
      ).toThrow('JWT_REFRESH_EXPIRES_IN must not be empty');
    });

    it('rejects invalid JWT_EXPIRES_IN format', () => {
      expect(() => validateEnv(baseValid({ JWT_EXPIRES_IN: 'abc' }))).toThrow(
        'JWT_EXPIRES_IN has an invalid format',
      );
    });

    it('rejects invalid JWT_REFRESH_EXPIRES_IN format', () => {
      expect(() =>
        validateEnv(baseValid({ JWT_REFRESH_EXPIRES_IN: 'xyz' })),
      ).toThrow('JWT_REFRESH_EXPIRES_IN has an invalid format');
    });

    it('accepts valid expiry formats', () => {
      expect(() => validateEnv(baseValid({ JWT_EXPIRES_IN: '30m' }))).not.toThrow();
      expect(() => validateEnv(baseValid({ JWT_EXPIRES_IN: '24h' }))).not.toThrow();
      expect(() => validateEnv(baseValid({ JWT_EXPIRES_IN: '7d' }))).not.toThrow();
      expect(() => validateEnv(baseValid({ JWT_EXPIRES_IN: '3600s' }))).not.toThrow();
    });
  });

  describe('normalization', () => {
    it('trims JWT_SECRET whitespace', () => {
      const result = validateEnv(baseValid({ JWT_SECRET: '  my-secret  ' }));
      expect(result.JWT_SECRET).toBe('my-secret');
    });

    it('trims JWT_REFRESH_SECRET whitespace', () => {
      const result = validateEnv(
        baseValid({ JWT_REFRESH_SECRET: '  my-refresh  ' }),
      );
      expect(result.JWT_REFRESH_SECRET).toBe('my-refresh');
    });

    it('does not mutate the input object except for documented normalization', () => {
      const input = baseValid();
      const inputCopy = { ...input };
      validateEnv(input);
      expect(input.JWT_SECRET).toBe(inputCopy.JWT_SECRET);
    });
  });

  describe('error safety', () => {
    it('does not include the secret value in error messages', () => {
      const secret = 'super-secret-value-12345';
      try {
        validateEnv(
          baseValid({
            JWT_SECRET: secret,
            JWT_REFRESH_SECRET: secret,
          }),
        );
        fail('should throw');
      } catch (e: unknown) {
        expect((e as Error).message).not.toContain(secret);
      }
    });

    it('does not include the secret in placeholder error', () => {
      const placeholderValue = 'cambia_este_secreto';
      try {
        validateEnv({
          NODE_ENV: 'production',
          JWT_SECRET: placeholderValue,
          JWT_REFRESH_SECRET: 'd'.repeat(64),
          JWT_EXPIRES_IN: '8h',
          JWT_REFRESH_EXPIRES_IN: '7d',
        });
        fail('should throw');
      } catch (e: unknown) {
        expect((e as Error).message).not.toContain(placeholderValue);
      }
    });
  });

  describe('NODE_ENV defaults', () => {
    it('defaults NODE_ENV to development when undefined', () => {
      const cfg = baseValid();
      delete cfg.NODE_ENV;
      const result = validateEnv(cfg);
      expect(result.NODE_ENV).toBe('development');
    });
  });

  describe('AUTH_REFRESH_THROTTLE_LIMIT', () => {
    it('defaults to 10 when undefined', () => {
      const cfg = baseValid();
      delete cfg.AUTH_REFRESH_THROTTLE_LIMIT;
      const result = validateEnv(cfg);
      expect(result.AUTH_REFRESH_THROTTLE_LIMIT).toBe(10);
    });

    it('accepts a valid positive integer', () => {
      const result = validateEnv(baseValid({ AUTH_REFRESH_THROTTLE_LIMIT: '5' }));
      expect(result.AUTH_REFRESH_THROTTLE_LIMIT).toBe(5);
    });

    it('rejects zero', () => {
      expect(() =>
        validateEnv(baseValid({ AUTH_REFRESH_THROTTLE_LIMIT: '0' })),
      ).toThrow('AUTH_REFRESH_THROTTLE_LIMIT must be a positive integer');
    });

    it('rejects negative values', () => {
      expect(() =>
        validateEnv(baseValid({ AUTH_REFRESH_THROTTLE_LIMIT: '-1' })),
      ).toThrow('AUTH_REFRESH_THROTTLE_LIMIT must be a positive integer');
    });

    it('rejects decimals', () => {
      expect(() =>
        validateEnv(baseValid({ AUTH_REFRESH_THROTTLE_LIMIT: '10.5' })),
      ).toThrow('AUTH_REFRESH_THROTTLE_LIMIT must be a positive integer');
    });

    it('rejects non-numeric strings', () => {
      expect(() =>
        validateEnv(baseValid({ AUTH_REFRESH_THROTTLE_LIMIT: 'abc' })),
      ).toThrow('AUTH_REFRESH_THROTTLE_LIMIT must be a positive integer');
    });

    it('rejects empty string', () => {
      expect(() =>
        validateEnv(baseValid({ AUTH_REFRESH_THROTTLE_LIMIT: '' })),
      ).toThrow('AUTH_REFRESH_THROTTLE_LIMIT must be a positive integer');
    });

    it('trims whitespace before validation', () => {
      const result = validateEnv(baseValid({ AUTH_REFRESH_THROTTLE_LIMIT: '  15  ' }));
      expect(result.AUTH_REFRESH_THROTTLE_LIMIT).toBe(15);
    });
  });

  describe('AUTH_REFRESH_THROTTLE_TTL_MS', () => {
    it('defaults to 60000 when undefined', () => {
      const cfg = baseValid();
      delete cfg.AUTH_REFRESH_THROTTLE_TTL_MS;
      const result = validateEnv(cfg);
      expect(result.AUTH_REFRESH_THROTTLE_TTL_MS).toBe(60000);
    });

    it('accepts a valid positive integer', () => {
      const result = validateEnv(baseValid({ AUTH_REFRESH_THROTTLE_TTL_MS: '30000' }));
      expect(result.AUTH_REFRESH_THROTTLE_TTL_MS).toBe(30000);
    });

    it('rejects zero', () => {
      expect(() =>
        validateEnv(baseValid({ AUTH_REFRESH_THROTTLE_TTL_MS: '0' })),
      ).toThrow('AUTH_REFRESH_THROTTLE_TTL_MS must be a positive integer');
    });

    it('rejects negative values', () => {
      expect(() =>
        validateEnv(baseValid({ AUTH_REFRESH_THROTTLE_TTL_MS: '-5000' })),
      ).toThrow('AUTH_REFRESH_THROTTLE_TTL_MS must be a positive integer');
    });

    it('rejects decimals', () => {
      expect(() =>
        validateEnv(baseValid({ AUTH_REFRESH_THROTTLE_TTL_MS: '1000.5' })),
      ).toThrow('AUTH_REFRESH_THROTTLE_TTL_MS must be a positive integer');
    });

    it('rejects non-numeric strings', () => {
      expect(() =>
        validateEnv(baseValid({ AUTH_REFRESH_THROTTLE_TTL_MS: 'not_a_number' })),
      ).toThrow('AUTH_REFRESH_THROTTLE_TTL_MS must be a positive integer');
    });
  });
});
