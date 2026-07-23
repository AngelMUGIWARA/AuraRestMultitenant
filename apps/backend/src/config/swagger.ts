const TRUTHY = new Set(['true', '1', 'yes', 'on']);
const FALSY = new Set(['false', '0', 'no', 'off']);

function parseBooleanFlag(value: string | undefined): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return undefined;
  if (TRUTHY.has(normalized)) return true;
  if (FALSY.has(normalized)) return false;
  return undefined;
}

export function isSwaggerEnabled(
  nodeEnv: string,
  swaggerEnabledEnv?: string,
): boolean {
  const flag = parseBooleanFlag(swaggerEnabledEnv);
  if (flag !== undefined) return flag;

  return nodeEnv !== 'production';
}

export function shouldPersistAuthorization(
  nodeEnv: string,
  swaggerEnabledEnv?: string,
): boolean {
  if (!isSwaggerEnabled(nodeEnv, swaggerEnabledEnv)) return false;
  return nodeEnv === 'development';
}
