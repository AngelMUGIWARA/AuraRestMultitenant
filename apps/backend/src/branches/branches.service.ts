import { Injectable, NotFoundException } from '@nestjs/common';
import { BranchesRepository } from './branches.repository';
import { ActivityLogService } from '../activity-log/activity-log.service';
import {
  BranchFiltersDto,
  BranchStatsResponseDto,
  CreateBranchDto,
  PaginatedBranchesDto,
  UpdateBranchDto,
} from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    private readonly repo: BranchesRepository,
    private readonly activityLog: ActivityLogService,
  ) {}

  /**
   * Devuelve la forma completa de BranchStats (@maison/types) que consume
   * SucursalesPage. Los campos que el modelo Branch todavía no representa
   * (mantenimiento, capacidad y rating) se devuelven en 0: si se omiten,
   * el frontend los recibe como undefined y las tarjetas muestran NaN.
   */
  async getStats(schemaName: string): Promise<BranchStatsResponseDto> {
    const { total, active } = await this.repo.getStats(schemaName);

    return {
      totalBranches: total,
      activeBranches: active,
      inactiveBranches: total - active,
      maintenanceBranches: 0,
      totalCapacity: 0,
      avgRating: 0,
    };
  }

  async getAll(
    schemaName: string,
    filters: BranchFiltersDto = new BranchFiltersDto(),
  ): Promise<PaginatedBranchesDto> {
    const { page = 1, limit = 20 } = filters;
    // 'maintenance' no tiene equivalente en isActive todavía: se ignora en
    // vez de filtrar (mostrar "sin resultados" sería engañoso — esas
    // sucursales sí existen, solo no podemos identificarlas como tales).
    const isActive =
      filters.status === 'active' ? true : filters.status === 'inactive' ? false : undefined;
    const { data, total } = await this.repo.findAll(schemaName, {
      skip: filters.skip,
      take: limit,
      search: filters.search,
      isActive,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
