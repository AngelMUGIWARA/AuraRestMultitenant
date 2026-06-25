import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dtos';
import { TenantsRepository } from './tenants.repository';

@Injectable()
export class TenantsService {
  constructor(private readonly repo: TenantsRepository) {}

  async findAll() {
    return this.repo.findAll();
  }

  async findOne(id: string) {
    const t = await this.repo.findById(id);
    if (!t) throw new NotFoundException('Tenant no encontrado');
    return t;
  }

  async create(dto: CreateTenantDto) {
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);
    return this.repo.update(id, dto);
  }
}
