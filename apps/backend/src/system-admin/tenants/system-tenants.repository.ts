import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateSystemTenantDto } from './dto/update-system-tenant.dto';

export interface CreateTenantRow {
  name: string;
  slug: string;
  schemaName: string;
  email: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  plan?: string;
}

@Injectable()
export class SystemTenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.tenant.findUnique({ where: { slug } });
  }

  create(data: CreateTenantRow) {
    return this.prisma.tenant.create({ data: data as any });
  }

  update(id: string, dto: UpdateSystemTenantDto) {
    return this.prisma.tenant.update({ where: { id }, data: dto as any });
  }

  updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') {
    return this.prisma.tenant.update({ where: { id }, data: { status } });
  }
}
