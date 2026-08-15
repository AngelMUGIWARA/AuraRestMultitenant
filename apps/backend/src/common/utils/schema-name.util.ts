/**
 * Valida que `schemaName` sea un identificador seguro para usarse como
 * nombre de schema de PostgreSQL (previene inyección SQL). Compartido entre
 * `TenantPrismaService` (arma la connection string de cada tenant) y
 * `TenantProvisioningService` (ejecuta `CREATE SCHEMA` con SQL crudo al
 * crear un tenant nuevo) para no duplicar una regex sensible a seguridad.
 */
export function assertValidSchemaName(schemaName: string): void {
  if (schemaName === undefined || schemaName === null) {
    throw new Error('schemaName es requerido');
  }
  if (typeof schemaName !== 'string') {
    throw new Error(`schemaName debe ser string, recibido ${typeof schemaName}`);
  }
  if (schemaName.trim().length === 0) {
    throw new Error('schemaName no puede estar vacío');
  }
  if (/\s/.test(schemaName)) {
    throw new Error('schemaName no puede contener espacios');
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName)) {
    throw new Error(
      `schemaName="${schemaName}" contiene caracteres no válidos para un esquema PostgreSQL`,
    );
  }
}

/** Deriva un schemaName seguro a partir del slug del tenant (ej. "mi-resto" -> "tenant_mi_resto"). */
export function deriveSchemaNameFromSlug(slug: string): string {
  const normalized = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const schemaName = `tenant_${normalized}`;
  assertValidSchemaName(schemaName);
  return schemaName;
}
