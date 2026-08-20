import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma-tenant';
import { TableStatus } from '../generated/prisma-tenant';
import { mapOrderStatusFromDb, mapOrderPaymentStatusFromDb } from '../common/utils/order-mapper';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { TablesRepository } from './tables.repository';

const GLOBAL_BRANCH_ROLES = new Set(['OWNER']);

export interface RequestingUser {
  id: string;
  role: string;
}

@Injectable()
export class TablesService {
  constructor(private readonly tablesRepo: TablesRepository) {}

  private async resolveBranchScope(
    schemaName: string,
    user: RequestingUser,
  ): Promise<string[] | null> {
    if (GLOBAL_BRANCH_ROLES.has(user.role)) return null;
    const branchIds = await this.tablesRepo.findUserBranchIds(schemaName, user.id);
    return branchIds.length > 0 ? branchIds : [];
  }

  async findAll(schemaName: string, branchId?: string, user?: RequestingUser) {
    let whereInput: Prisma.RestaurantTableWhereInput | undefined;

    if (branchId) {
      whereInput = { branchId };
    } else if (user) {
      const scope = await this.resolveBranchScope(schemaName, user);
      if (scope) {
        whereInput = { branchId: { in: scope } };
      }
    }

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

    const { branchId, ...rest } = dto;

    const table = await this.tablesRepo.create(schemaName, {
      ...rest,
      branch: { connect: { id: branchId! } },
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

    const { branchId, ...rest } = dto;
    const data: Prisma.RestaurantTableUpdateInput = {
      ...rest,
      ...(branchId !== undefined ? { branchId } : {}),
    };

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
    const activeOrder = table.orders?.[0] ?? null;

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
      activeOrder: activeOrder
        ? {
            id: activeOrder.id,
            orderNumber: activeOrder.folio,
            status: mapOrderStatusFromDb(activeOrder.status),
            paymentStatus: mapOrderPaymentStatusFromDb(activeOrder.paymentStatus),
            total: Number(activeOrder.total),
            itemCount: activeOrder.orderItems?.length ?? 0,
            waiterName: activeOrder.user?.name || null,
            waiterId: activeOrder.user?.id || null,
            ticketPrinted: activeOrder.ticketPrinted ?? false,
            items: (activeOrder.orderItems ?? []).map((item: any) => ({
              name: item.menuItem?.name || '',
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
            })),
          }
        : null,
    };
  }
}
