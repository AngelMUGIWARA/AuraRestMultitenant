import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { mapTableStatusFromDb } from '../common/utils/order-mapper';
import { TablesRepository } from './tables.repository';
import { TableStatus } from '../generated/prisma-tenant';

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

  async updateStatus(schemaName: string, id: string, status: string) {  
    const table = await this.tablesRepo.findById(schemaName, id);
    if (!table) throw new NotFoundException('Mesa no encontrada');
    const map: Record<string, TableStatus> = {
      free: TableStatus.AVAILABLE,
      occupied: TableStatus.OCCUPIED,
      reserved: TableStatus.RESERVED,
      maintenance: TableStatus.MAINTENANCE,
    };
  
    const dbStatus = map[status];
    if (!dbStatus) throw new BadRequestException('Estado inválido');
    const updated = await this.tablesRepo.updateStatus(schemaName, id, dbStatus);
    return this.toResponse(updated);
  }

  private toResponse(table: any) {
    return {
      id: table.id,
      number: table.number,
      name: table.name || null,
      capacity: table.capacity,
      status: mapTableStatusFromDb(table.status),
      locationZone: table.locationZone || null,
      isActive: table.isActive,
      createdAt: table.createdAt?.toISOString(),
      updatedAt: table.updatedAt?.toISOString(),
    };
  }
}
