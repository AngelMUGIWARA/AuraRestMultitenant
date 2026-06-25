import { Injectable, NotFoundException } from '@nestjs/common';
import { BranchesRepository } from './branches.repository';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly repo: BranchesRepository) {}

  async getStats(schemaName: string) {
    return this.repo.getStats(schemaName);
  }

  async getAll(
    schemaName: string,
    params: { skip?: number; take?: number } = {},
  ) {
    return this.repo.findAll(schemaName, params);
  }

  async getOne(schemaName: string, id: string) {
    const b = await this.repo.findById(schemaName, id);
    if (!b) throw new NotFoundException('Sucursal no encontrada');
    return b;
  }

  async create(schemaName: string, dto: CreateBranchDto) {
    return this.repo.create(schemaName, dto);
  }

  async update(schemaName: string, id: string, dto: UpdateBranchDto) {
    await this.getOne(schemaName, id);
    return this.repo.update(schemaName, id, dto);
  }

  async activate(schemaName: string, id: string) {
    await this.getOne(schemaName, id);
    return this.repo.setActive(schemaName, id, true);
  }

  async deactivate(schemaName: string, id: string) {
    await this.getOne(schemaName, id);
    return this.repo.setActive(schemaName, id, false);
  }

  async remove(schemaName: string, id: string) {
    await this.getOne(schemaName, id);
    return this.repo.remove(schemaName, id);
  }
}
