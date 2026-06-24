import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dtos';

@Injectable()
export class TenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  async create(dto: CreateTenantDto) {
    return this.prisma.tenant.create({ data: dto });
  }

  async update(id: string, dto: UpdateTenantDto) {
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }
}
