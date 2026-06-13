import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient as TenantPrismaClient } from '../generated/prisma-tenant';

/**
 * Crea y cachea un PrismaClient por cada schema de tenant.
 * Cada cliente apunta a  DATABASE_URL?schema=<schemaName>
 * lo que hace que PostgreSQL aplique  SET search_path = <schemaName>.
 */
@Injectable()
export class TenantPrismaService implements OnModuleDestroy {
  private readonly clients = new Map<string, TenantPrismaClient>();

  getClient(schemaName: string): TenantPrismaClient {
    if (!this.clients.has(schemaName)) {
      const base = process.env.DATABASE_URL!;
      const url = base.includes('?')
        ? `${base}&schema=${schemaName}`
        : `${base}?schema=${schemaName}`;

      const client = new TenantPrismaClient({
        datasources: { db: { url } },
      });

      this.clients.set(schemaName, client);
    }

    return this.clients.get(schemaName)!;
  }

  async onModuleDestroy() {
    for (const client of this.clients.values()) {
      await client.$disconnect();
    }
    this.clients.clear();
  }
}
