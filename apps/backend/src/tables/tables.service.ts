import { Injectable, NotFoundException } from '@nestjs/common';
import { mapTableStatusFromDb } from '../common/utils/order-mapper';
import { TablesRepository } from './tables.repository';

@Injectable()
export class TablesService {
  constructor(private readonly tablesRepo: TablesRepository) {}

  async findAll(schemaName: string) {
    const tables = await this.tablesRepo.findAll(schemaName);
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
    const map: Record<string, string> = {
      free: 'AVAILABLE',
      occupied: 'OCCUPIED',
      reserved: 'RESERVED',
      maintenance: 'MAINTENANCE',
    };
    const dbStatus = map[status] || status;
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
