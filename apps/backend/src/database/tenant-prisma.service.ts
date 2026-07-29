import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient as TenantPrismaClient } from '../generated/prisma-tenant';
import { assertValidSchemaName } from '../common/utils/schema-name.util';

interface ClientEntry {
  client: TenantPrismaClient;
  lastUsed: number;
  createdAt: number;
}

@Injectable()
export class TenantPrismaService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantPrismaService.name);

  private readonly clients = new Map<string, ClientEntry>();

  private readonly maxClients: number;
  private readonly ttlMs: number;
  private readonly cleanupIntervalMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config?: ConfigService) {
    const getEnv = (key: string, def: number): number => {
      const raw = config?.get<string>(key) ?? process.env[key];
      if (raw === undefined || raw === '') return def;
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) {
        this.logger.warn(
          `${key}="${raw}" no es válido, usando default=${def}`,
        );
        return def;
      }
      return n;
    };

    this.maxClients = getEnv('TENANT_PRISMA_MAX_CLIENTS', 10);
    this.ttlMs = getEnv('TENANT_PRISMA_CLIENT_TTL_MS', 300_000);
    this.cleanupIntervalMs = getEnv(
      'TENANT_PRISMA_CLEANUP_INTERVAL_MS',
      60_000,
    );

    this.startCleanupTimer();
  }

  // ── Público ──────────────────────────────────────────────

  getClient(schemaName: string): TenantPrismaClient {
    assertValidSchemaName(schemaName);

    const existing = this.clients.get(schemaName);
    if (existing) {
      existing.lastUsed = Date.now();
      // Re-insert to update insertion order (LRU)
      this.clients.delete(schemaName);
      this.clients.set(schemaName, existing);
      return existing.client;
    }

    // Create new client
    const client = this.createClient(schemaName);
    const entry: ClientEntry = {
      client,
      lastUsed: Date.now(),
      createdAt: Date.now(),
    };

    this.clients.set(schemaName, entry);

    if (this.clients.size > this.maxClients) {
      this.evictIdle();
    }

    this.logger.log(`Cliente Prisma creado para schema="${schemaName}"`);
    return client;
  }

  // ── Ciclo de vida ────────────────────────────────────────

  async onModuleDestroy() {
    this.stopCleanupTimer();
    const entries = Array.from(this.clients.entries());
    this.clients.clear();
    const results = await Promise.allSettled(
      entries.map(([schema, entry]) =>
        entry.client
          .$disconnect()
          .catch((err) =>
            this.logger.error(
              `Error al desconectar schema="${schema}": ${err}`,
            ),
          ),
      ),
    );
    const rejected = results.filter((r) => r.status === 'rejected').length;
    this.logger.log(
      `TenantPrismaService cerrado: ${entries.length} clientes, ${rejected} errores`,
    );
  }

  // ── Privado: creación ────────────────────────────────────

  private createClient(schemaName: string): TenantPrismaClient {
    const base = process.env.DATABASE_URL;
    if (!base) {
      throw new Error('DATABASE_URL no está configurada');
    }
    const url = base.includes('?')
      ? `${base}&schema=${schemaName}`
      : `${base}?schema=${schemaName}`;

    return new TenantPrismaClient({
      datasources: { db: { url } },
    });
  }

  // ── Privado: evicción LRU suave ──────────────────────────

  private evictIdle(): void {
    const now = Date.now();
    let oldestEntry: [string, ClientEntry] | null = null;

    for (const entry of this.clients) {
      const idleTime = now - entry[1].lastUsed;
      if (idleTime >= this.ttlMs) {
        if (
          oldestEntry === null ||
          entry[1].lastUsed < oldestEntry[1].lastUsed
        ) {
          oldestEntry = entry;
        }
      }
    }

    if (oldestEntry) {
      const [schema, entry] = oldestEntry;
      this.clients.delete(schema);
      this.disconnectSafely(schema, entry);
      this.logger.log(
        `Cliente evictado: schema="${schema}" (límite ${this.maxClients})`,
      );
    } else {
      this.logger.warn(
        `Pool de clientes (${this.clients.size}) supera máximo (${this.maxClients}) ` +
          `pero todos los clientes están activos. Se permite exceder temporalmente.`,
      );
    }
  }

  // ── Privado: limpieza por TTL ────────────────────────────

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [schema, entry] of this.clients) {
      if (now - entry.lastUsed >= this.ttlMs) {
        this.clients.delete(schema);
        this.disconnectSafely(schema, entry);
        this.logger.log(
          `Cliente expirado por TTL: schema="${schema}" ` +
            `(inactivo ${((now - entry.lastUsed) / 1000).toFixed(0)}s)`,
        );
      }
    }
  }

  // ── Privado: desconexión segura ──────────────────────────

  private disconnectSafely(schema: string, entry: ClientEntry): void {
    entry.client.$disconnect().catch((err) => {
      this.logger.error(
        `Error al desconectar schema="${schema}": ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }

  // ── Privado: timer ───────────────────────────────────────

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.cleanupIntervalMs);
    if (typeof this.cleanupTimer?.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
