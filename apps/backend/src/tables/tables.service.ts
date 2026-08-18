import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TablesRepository } from './tables.repository';
import { TableStatus } from '../generated/prisma-tenant';
import type { Prisma } from '../generated/prisma-tenant';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Injectable()
export class TablesService {
  constructor(private readonly tablesRepo: TablesRepository) {}

  async findAll(schemaName: string, branchId?: string) {
    const whereInput = branchId ? { branchId } : undefined;
    const tables = await this.tablesRepo.findAll(schemaName, whereInput);
    return tables.map((t) => this.toResponse(t));
  }

  async findById(schemaName: string, id: string) {
    const table = await this.tablesRepo.findById(schemaName, id);
    if (!table) throw new NotFoundException('Mesa no encontrada');
    return this.toResponse(table);
  }

  async updateStatus(schemaName: string, id: string, status: TableStatus) {
    const table = await this.tablesRepo.findById(schemaName, id);
    if (!table) throw new NotFoundException('Mesa no encontrada');
    const updated = await this.tablesRepo.updateStatus(schemaName, id, status);
    return this.toResponse(updated);
  }

  async create(schemaName: string, dto: CreateTableDto) {
    // Validar que branchId está presente
    if (!dto.branchId) {
      throw new ConflictException('branchId es requerido para crear una mesa');
    }

    // Validar que la sucursal existe
    const existing = await this.tablesRepo.findByNumberAndBranch(
      schemaName,
      dto.number,
      dto.branchId,
    );
    if (existing) {
      throw new ConflictException(
        `Ya existe la Mesa ${dto.number} en esta sucursal`,
      );
    }

    const table = await this.tablesRepo.create(schemaName, {
      ...dto,
      branch: {
        connect: { id: dto.branchId! },
      },
      status: 'AVAILABLE',
      isActive: true,
    });
    return this.toResponse(table);
  }

  async update(schemaName: string, id: string, dto: UpdateTableDto) {
    const table = await this.tablesRepo.findById(schemaName, id);
    if (!table) throw new NotFoundException('Mesa no encontrada');

    // Si se cambia el número, validar que no exista otro con ese número en la misma sucursal
    if (dto.number !== undefined && dto.number !== table.number) {
      const existing = await this.tablesRepo.findByNumberAndBranch(
        schemaName,
        dto.number,
        table.branchId,
      );
      if (existing) {
        throw new ConflictException(
          `Ya existe la Mesa ${dto.number} en esta sucursal`,
        );
      }
    }

    const data: Prisma.RestaurantTableUpdateInput = { ...dto };

    const updated = await this.tablesRepo.update(schemaName, id, data);
    return this.toResponse(updated);
  }

  async delete(schemaName: string, id: string) {
    const table = await this.tablesRepo.findById(schemaName, id);
    if (!table) throw new NotFoundException('Mesa no encontrada');

    // Si tiene historial (órdenes o reservaciones), desactivar
    const hasHistory = await this.tablesRepo.hasHistory(schemaName, id);
    if (hasHistory) {
      const updated = await this.tablesRepo.update(schemaName, id, {
        isActive: false,
      });
      return this.toResponse(updated);
    }

    // Si no tiene historial, eliminar
    await this.tablesRepo.delete(schemaName, id);
    return { success: true, message: 'Mesa eliminada' };
  }

  private toResponse(table: any) {
    return {
      id: table.id,
      number: table.number,
      name: table.name || null,
      capacity: table.capacity,
      status: table.status as TableStatus,
      locationZone: table.locationZone || null,
      isActive: table.isActive,
      branchId: table.branchId,
      createdAt: table.createdAt?.toISOString(),
      updatedAt: table.updatedAt?.toISOString(),
    };
  }
}
