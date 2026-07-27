export class InvalidEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEnvironmentError';
  }
}

const INSECURE_PLACEHOLDERS = [
  'cambia_este_secreto',
  'cambia_este_secreto_por_uno_seguro_en_produccion',
  'cambia_este_secreto_por_otro_seguro_en_produccion',
  'cambieste_secreto',
  'change_me',
  'changeme',
  'secret',
  'jwt_secret',
  'your_secret_here',
  'development_secret',
  'default_secret',
  'CAMBIAME_USA_UN_SECRETO_UNICO_AQUI',
  'CAMBIAME_USA_OTRO_SECRETO_UNICO_AQUI',
];

function normalizeLower(s: string): string {
  return s.toLowerCase().replace(/[\s_\-]/g, '');
}

function isPlaceholder(value: string): boolean {
  const normalized = normalizeLower(value);
  return INSECURE_PLACEHOLDERS.some((p) => normalized === normalizeLower(p));
}

function isValidExpiresIn(value: string): boolean {
  return /^\d+[smhd]$/i.test(value.trim());
}

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];

  const nodeEnv = (config.NODE_ENV as string) ?? 'development';
  const isProduction = nodeEnv === 'production';

  // ── NODE_ENV ──────────────────────────────────────────────
  if (!config.NODE_ENV) {
    config.NODE_ENV = 'development';
  }

  // ── JWT_SECRET ────────────────────────────────────────────
  const jwtSecretRaw = config.JWT_SECRET;
  if (jwtSecretRaw === undefined || jwtSecretRaw === null) {
    errors.push('JWT_SECRET is required');
  } else {
    const jwtSecret = String(jwtSecretRaw).trim();
    config.JWT_SECRET = jwtSecret;
    if (jwtSecret.length === 0) {
      errors.push('JWT_SECRET must not be empty');
    } else {
      if (isProduction) {
        if (isPlaceholder(jwtSecret)) {
          errors.push('JWT_SECRET is insecure for production');
        }
        if (jwtSecret.length < 32) {
          errors.push('JWT_SECRET is too short for production (minimum 32 characters)');
        }
      }
    }
  }

  // ── JWT_REFRESH_SECRET ────────────────────────────────────
  const jwtRefreshRaw = config.JWT_REFRESH_SECRET;
  if (jwtRefreshRaw === undefined || jwtRefreshRaw === null) {
    errors.push('JWT_REFRESH_SECRET is required');
  } else {
    const jwtRefresh = String(jwtRefreshRaw).trim();
    config.JWT_REFRESH_SECRET = jwtRefresh;
    if (jwtRefresh.length === 0) {
      errors.push('JWT_REFRESH_SECRET must not be empty');
    } else {
      if (isProduction) {
        if (isPlaceholder(jwtRefresh)) {
          errors.push('JWT_REFRESH_SECRET is insecure for production');
        }
        if (jwtRefresh.length < 32) {
          errors.push('JWT_REFRESH_SECRET is too short for production (minimum 32 characters)');
        }
      }
    }
  }

  // ── Secrets must be different ─────────────────────────────
  if (
    typeof config.JWT_SECRET === 'string' &&
    typeof config.JWT_REFRESH_SECRET === 'string' &&
    config.JWT_SECRET.length > 0 &&
    config.JWT_REFRESH_SECRET.length > 0 &&
    config.JWT_SECRET === config.JWT_REFRESH_SECRET
  ) {
    errors.push('JWT_SECRET must be different from JWT_REFRESH_SECRET');
  }

  // ── JWT_EXPIRES_IN ────────────────────────────────────────
  const expiresInRaw = config.JWT_EXPIRES_IN;
  if (expiresInRaw !== undefined && expiresInRaw !== null) {
    const expiresIn = String(expiresInRaw).trim();
    config.JWT_EXPIRES_IN = expiresIn;
    if (expiresIn.length === 0) {
      errors.push('JWT_EXPIRES_IN must not be empty');
    } else if (!isValidExpiresIn(expiresIn)) {
      errors.push('JWT_EXPIRES_IN has an invalid format (expected: e.g. 8h, 30m, 7d)');
    }
  } else {
    config.JWT_EXPIRES_IN = '8h';
  }

  // ── JWT_REFRESH_EXPIRES_IN ────────────────────────────────
  const refreshExpiresRaw = config.JWT_REFRESH_EXPIRES_IN;
  if (refreshExpiresRaw !== undefined && refreshExpiresRaw !== null) {
    const refreshExpires = String(refreshExpiresRaw).trim();
    config.JWT_REFRESH_EXPIRES_IN = refreshExpires;
    if (refreshExpires.length === 0) {
      errors.push('JWT_REFRESH_EXPIRES_IN must not be empty');
    } else if (!isValidExpiresIn(refreshExpires)) {
      errors.push('JWT_REFRESH_EXPIRES_IN has an invalid format (expected: e.g. 7d, 30m)');
    }
  } else {
    config.JWT_REFRESH_EXPIRES_IN = '7d';
  }

  // ── AUTH_REFRESH_THROTTLE_LIMIT ───────────────────────────
  const refreshThrottleLimitRaw = config.AUTH_REFRESH_THROTTLE_LIMIT;
  if (refreshThrottleLimitRaw !== undefined && refreshThrottleLimitRaw !== null) {
    const limit = Number(String(refreshThrottleLimitRaw).trim());
    if (Number.isNaN(limit) || !Number.isInteger(limit) || limit <= 0) {
      errors.push('AUTH_REFRESH_THROTTLE_LIMIT must be a positive integer');
    } else {
      config.AUTH_REFRESH_THROTTLE_LIMIT = limit;
    }
  } else {
    config.AUTH_REFRESH_THROTTLE_LIMIT = 10;
  }

  // ── AUTH_REFRESH_THROTTLE_TTL_MS ──────────────────────────
  const refreshThrottleTtlRaw = config.AUTH_REFRESH_THROTTLE_TTL_MS;
  if (refreshThrottleTtlRaw !== undefined && refreshThrottleTtlRaw !== null) {
    const ttl = Number(String(refreshThrottleTtlRaw).trim());
    if (Number.isNaN(ttl) || !Number.isInteger(ttl) || ttl <= 0) {
      errors.push('AUTH_REFRESH_THROTTLE_TTL_MS must be a positive integer');
    } else {
      config.AUTH_REFRESH_THROTTLE_TTL_MS = ttl;
    }
  } else {
    config.AUTH_REFRESH_THROTTLE_TTL_MS = 60000;
  }

    // ── CLOUDINARY_CLOUD_NAME ──────────────────────────
  const cloudNameRaw = config.CLOUDINARY_CLOUD_NAME;
  if (cloudNameRaw === undefined || cloudNameRaw === null) {
    errors.push('CLOUDINARY_CLOUD_NAME is required');
  } else {
    const cloudName = String(cloudNameRaw).trim();
    config.CLOUDINARY_CLOUD_NAME = cloudName;

    if (cloudName.length === 0) {
      errors.push('CLOUDINARY_CLOUD_NAME must not be empty');
    }
  }

  // ── CLOUDINARY_API_KEY ─────────────────────────────
  const cloudinaryApiKeyRaw = config.CLOUDINARY_API_KEY;
  if (cloudinaryApiKeyRaw === undefined || cloudinaryApiKeyRaw === null) {
    errors.push('CLOUDINARY_API_KEY is required');
  } else {
    const cloudinaryApiKey = String(cloudinaryApiKeyRaw).trim();
    config.CLOUDINARY_API_KEY = cloudinaryApiKey;

    if (cloudinaryApiKey.length === 0) {
      errors.push('CLOUDINARY_API_KEY must not be empty');
    }
  }

  // ── CLOUDINARY_API_SECRET ──────────────────────────
  const cloudinaryApiSecretRaw = config.CLOUDINARY_API_SECRET;
  if (
    cloudinaryApiSecretRaw === undefined ||
    cloudinaryApiSecretRaw === null
  ) {
    errors.push('CLOUDINARY_API_SECRET is required');
  } else {
    const cloudinaryApiSecret = String(cloudinaryApiSecretRaw).trim();
    config.CLOUDINARY_API_SECRET = cloudinaryApiSecret;

    if (cloudinaryApiSecret.length === 0) {
      errors.push('CLOUDINARY_API_SECRET must not be empty');
    }
  }

  if (errors.length > 0) {
    throw new InvalidEnvironmentError(
      `Environment validation failed:\n  - ${errors.join('\n  - ')}`,
    );
  }

  return config;
}
