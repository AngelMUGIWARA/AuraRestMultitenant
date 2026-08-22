import { ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { TenantPrismaService } from '../../database/tenant-prisma.service';
import { deriveSchemaNameFromSlug } from '../../common/utils/schema-name.util';
import { SystemTenantsRepository } from './system-tenants.repository';
import { CreateSystemTenantDto } from './dto/create-system-tenant.dto';
import { CreateTenantResponseDto } from './dto/tenant-response.dto';

const TENANT_ROLE_NAMES = ['OWNER', 'MANAGER', 'WAITER', 'CASHIER', 'KITCHEN_STAFF'];

// apps/backend, tanto en ts-node (src/system-admin/tenants) como compilado (dist/system-admin/tenants)
const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const TENANT_MIGRATIONS_DIR = path.join(BACKEND_ROOT, 'prisma/tenant/migrations');

function generateTemporaryPassword(): string {
  return `Temp${randomBytes(6).toString('hex')}`;
}

/**
 * Parser deliberadamente simple: quita líneas de comentario `-- ...` y
 * separa por `;`. Suficiente para las migraciones actuales del tenant
 * (ninguna usa DO $$ / funciones con `;` internos) — si eso cambia, este
 * split ingenuo dejará de ser seguro.
 */
function splitSqlStatements(sql: string): string[] {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantPrisma: TenantPrismaService,
    private readonly repository: SystemTenantsRepository,
  ) {}

  /**
   * Aprovisiona un tenant de punta a punta: crea el schema de Postgres,
   * aplica las migraciones del tenant sobre ese schema, y siembra roles +
   * una sucursal inicial + el primer usuario OWNER. Es una operación de
   * varios segundos — aceptable para una acción de Super Admin, no pensada
   * para alto volumen/paralelismo.
   *
   * Las migraciones se aplican ejecutando el SQL de cada
   * prisma/tenant/migrations/*\/migration.sql directamente (ver
   * applyTenantMigrations), en vez de invocar `prisma migrate deploy` como
   * child process: en este entorno el CLI de Prisma ignora el override de
   * DATABASE_URL pasado al child process y siempre usa el de `.env`
   * (prioriza su propio dotenv por encima del env ya seteado), así que
   * shellear el CLI nunca apuntaría al schema del tenant nuevo.
   *
   * Si falla a medio camino, el schema/fila de tenant pueden quedar
   * creados sin terminar de sembrarse — no hay rollback automático, se
   * asume que un Super Admin puede reintentar o limpiar manualmente.
   */
  async provisionTenant(dto: CreateSystemTenantDto): Promise<CreateTenantResponseDto> {
    const existing = await this.repository.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException(`Ya existe un tenant con slug="${dto.slug}"`);
    }

    const existingEmail = await this.repository.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException(`Ya existe un tenant registrado con el correo "${dto.email}"`);
    }

    const schemaName = deriveSchemaNameFromSlug(dto.slug);

    await this.createPostgresSchema(schemaName);

    const tenant = await this.repository.create({
      name: dto.name,
      slug: dto.slug,
      schemaName,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      logoUrl: dto.logoUrl,
      plan: dto.plan,
    });

    await this.applyTenantMigrations(schemaName);

    const temporaryPassword = generateTemporaryPassword();
    await this.seedTenantSchema(schemaName, dto.ownerName, dto.ownerEmail, temporaryPassword);

    return {
      tenant: tenant as any,
      owner: { email: dto.ownerEmail, temporaryPassword },
    };
  }

  /**
   * Genera una contraseña temporal NUEVA para el usuario OWNER de un tenant
   * (no se puede "recuperar" la anterior — está guardada como hash bcrypt de
   * un solo sentido). Marca mustChangePassword=true de nuevo y revoca las
   * refresh sessions activas de ese usuario, igual que hace el cambio de
   * contraseña normal en auth.service.ts.
   */
  async resetOwnerPassword(tenantId: string): Promise<{ email: string; temporaryPassword: string }> {
    const tenant = await this.repository.findById(tenantId);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const db = this.tenantPrisma.getClient(tenant.schemaName);
    const owner = await db.user.findFirst({ where: { role: 'OWNER' } });
    if (!owner) throw new NotFoundException('Este tenant no tiene un usuario OWNER');

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, Number(process.env.BCRYPT_ROUNDS ?? 10));

    await db.user.update({
      where: { id: owner.id },
      data: { passwordHash, mustChangePassword: true },
    });

    await this.prisma.refreshSession.updateMany({
      where: { userId: owner.id, tenantSchemaName: tenant.schemaName, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { email: owner.email, temporaryPassword };
  }

  private async createPostgresSchema(schemaName: string): Promise<void> {
    // schemaName ya fue validado por deriveSchemaNameFromSlug() como identificador
    // seguro (solo [a-zA-Z0-9_]) — $executeRawUnsafe es seguro aquí.
    await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  }

  private async applyTenantMigrations(schemaName: string): Promise<void> {
    const db = this.tenantPrisma.getClient(schemaName);
    const migrationDirs = fs
      .readdirSync(TENANT_MIGRATIONS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const dir of migrationDirs) {
      const sqlPath = path.join(TENANT_MIGRATIONS_DIR, dir, 'migration.sql');
      if (!fs.existsSync(sqlPath)) continue;

      const statements = splitSqlStatements(fs.readFileSync(sqlPath, 'utf-8'));
      try {
        for (const statement of statements) {
          await db.$executeRawUnsafe(statement);
        }
      } catch (err) {
        this.logger.error(`Fallo al aplicar migración "${dir}" en schema="${schemaName}": ${err}`);
        throw new InternalServerErrorException(
          `El tenant se creó pero la migración "${dir}" falló para el schema "${schemaName}". Revisa los logs del backend.`,
        );
      }
    }
  }

  private async seedTenantSchema(
    schemaName: string,
    ownerName: string,
    ownerEmail: string,
    temporaryPassword: string,
  ): Promise<void> {
    const db = this.tenantPrisma.getClient(schemaName);

    await Promise.all(TENANT_ROLE_NAMES.map((name) => db.role.upsert({ where: { name }, update: {}, create: { name } })));

    const branch = await db.branch.create({
      data: { name: 'Sucursal Principal', slug: 'principal' },
    });

    const ownerRole = await db.role.findUnique({ where: { name: 'OWNER' } });
    const passwordHash = await bcrypt.hash(temporaryPassword, Number(process.env.BCRYPT_ROUNDS ?? 10));

    const owner = await db.user.create({
      data: {
        name: ownerName,
        email: ownerEmail,
        passwordHash,
        role: 'OWNER',
        status: 'ACTIVE',
        mustChangePassword: true,
      },
    });

    if (ownerRole) {
      await db.userBranch.create({
        data: { userId: owner.id, branchId: branch.id, roleId: ownerRole.id },
      });
    }
  }
}
