import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { PrismaClient } from '../generated/prisma-tenant';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string): PrismaClient {
    return this.tenantPrisma.getClient(schemaName);
  }

  async findAll(
    schemaName: string,
    params: { skip?: number; take?: number } = {},
  ) {
    const db = this.db(schemaName);
    const [data, total] = await Promise.all([
      db.branch.findMany({
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      db.branch.count(),
    ]);
    return { data, total };
  }

  async findById(schemaName: string, id: string) {
    return this.db(schemaName).branch.findUnique({ where: { id } });
  }

  async create(schemaName: string, dto: CreateBranchDto) {
    const data = { ...dto } as any;
    if (!data.slug) {
      data.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    return this.db(schemaName).branch.create({ data });
  }

  async update(schemaName: string, id: string, dto: UpdateBranchDto) {
    return this.db(schemaName).branch.update({ where: { id }, data: dto });
  }

  async remove(schemaName: string, id: string) {
    return this.db(schemaName).branch.delete({ where: { id } });
  }

  async setActive(schemaName: string, id: string, active: boolean) {
    return this.db(schemaName).branch.update({
      where: { id },
      data: { isActive: active },
    });
  }

  async getStats(schemaName: string) {
    // ejemplo simple: contar sucursales y activas
    const db = this.db(schemaName);
    const total = await db.branch.count();
    const active = await db.branch.count({ where: { isActive: true } });
    return { total, active };
  }
}
