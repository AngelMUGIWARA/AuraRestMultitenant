const TRAILING_SLASH_RE = /\/+$/;

export function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((o) => o.trim().replace(TRAILING_SLASH_RE, ''))
    .filter((o) => o.length > 0);
}

export function isOriginAllowed(
  origin: string | undefined | null,
  allowedOrigins: string[],
): boolean {
  if (!origin || allowedOrigins.length === 0) return false;
  const normalized = origin.trim().replace(TRAILING_SLASH_RE, '');
  return allowedOrigins.includes(normalized);
}
