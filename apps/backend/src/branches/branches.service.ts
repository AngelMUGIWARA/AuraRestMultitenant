import { Injectable, NotFoundException } from '@nestjs/common';
import { BranchesRepository } from './branches.repository';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    private readonly repo: BranchesRepository,
    private readonly activityLog: ActivityLogService,
  ) {}

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

  async create(schemaName: string, dto: CreateBranchDto, userId?: string) {
    const branch = await this.repo.create(schemaName, dto);
    if (userId) {
      this.activityLog.log(schemaName, {
        branchId: branch.id,
        userId,
        action: 'BRANCH_CREATED',
        entity: 'BRANCH',
        entityId: branch.id,
        changes: JSON.stringify({ name: dto.name, address: dto.address }),
      });
    }
    return branch;
  }

  async update(schemaName: string, id: string, dto: UpdateBranchDto) {
    await this.getOne(schemaName, id);
    return this.repo.update(schemaName, id, dto);
  }

  async activate(schemaName: string, id: string, userId?: string) {
    const branch = await this.getOne(schemaName, id);
    const updated = await this.repo.setActive(schemaName, id, true);
    if (userId) {
      this.activityLog.log(schemaName, {
        branchId: id,
        userId,
        action: 'BRANCH_ACTIVATED',
        entity: 'BRANCH',
        entityId: id,
        changes: JSON.stringify({ wasActive: branch.isActive }),
      });
    }
    return updated;
  }

  async deactivate(schemaName: string, id: string, userId?: string) {
    const branch = await this.getOne(schemaName, id);
    const updated = await this.repo.setActive(schemaName, id, false);
    if (userId) {
      this.activityLog.log(schemaName, {
        branchId: id,
        userId,
        action: 'BRANCH_DEACTIVATED',
        entity: 'BRANCH',
        entityId: id,
        changes: JSON.stringify({ wasActive: branch.isActive }),
      });
    }
    return updated;
  }

  async remove(schemaName: string, id: string) {
    await this.getOne(schemaName, id);
    return this.repo.remove(schemaName, id);
  }
}
