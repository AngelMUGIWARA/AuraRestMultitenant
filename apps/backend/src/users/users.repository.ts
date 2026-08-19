import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { PrismaClient } from '../generated/prisma-tenant';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * Capa de acceso a datos para Users.
 * Recibe el schemaName en cada método para obtener el cliente Prisma correcto.
 * Nunca contiene lógica de negocio — solo operaciones de BD.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string): PrismaClient {
    return this.tenantPrisma.getClient(schemaName);
  }

  async findAll(schemaName: string, params: { skip: number; take: number }) {
    const db = this.db(schemaName);
    const [data, total] = await Promise.all([
      db.user.findMany({
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        omit: { passwordHash: true },
      }),
      db.user.count(),
    ]);
    return { data, total };
  }

  /**
   * Conteos agregados para el panel de administración.
   * Se resuelven en paralelo; los groupBy evitan una consulta por cada
   * estado/rol.
   */
  async getStats(schemaName: string, since: Date) {
    const db = this.db(schemaName);
    const [total, byStatus, byRole, pending, newSince] = await Promise.all([
      db.user.count(),
      db.user.groupBy({ by: ['status'], _count: { _all: true } }),
      db.user.groupBy({ by: ['role'], _count: { _all: true } }),
      db.user.count({ where: { mustChangePassword: true } }),
      db.user.count({ where: { createdAt: { gte: since } } }),
    ]);
    return { total, byStatus, byRole, pending, newSince };
  }

  async findById(schemaName: string, id: string) {
    return this.db(schemaName).user.findUnique({
      where: { id },
      omit: { passwordHash: true },
    });
  }

  async findByEmail(schemaName: string, email: string) {
    return this.db(schemaName).user.findUnique({ where: { email } });
  }

  async countStaff(schemaName: string) {
    return this.db(schemaName).user.count({
      where: {
        role: {
          in: ['MANAGER', 'WAITER', 'CASHIER', 'KITCHEN_STAFF'],
        },
      },
    });
  }

  async create(schemaName: string, dto: CreateUserDto) {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(
      dto.password,
      Number(process.env.BCRYPT_ROUNDS ?? 10),
    );
    return this.db(schemaName).user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role,
        phone: dto.phone,
      },
      omit: { passwordHash: true },
    });
  }

  async createInvite(
    schemaName: string,
    data: {
      name: string;
      email: string;
      role: string;
      passwordHash: string;
      branchId?: string;
    },
  ) {
    const user = await this.db(schemaName).user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role as any,
        status: 'ACTIVE',
        mustChangePassword: true,
      },
      omit: { passwordHash: true },
    });

    if (data.branchId) {
      const roleRecord = await this.db(schemaName).role.findUnique({
        where: { name: data.role as any },
      });
      if (roleRecord) {
        await this.db(schemaName).userBranch.create({
          data: {
            userId: user.id,
            branchId: data.branchId,
            roleId: roleRecord.id,
          },
        });
      }
    }

    return user;
  }

  async update(schemaName: string, id: string, dto: UpdateUserDto) {
    return this.db(schemaName).user.update({
      where: { id },
      data: dto,
      omit: { passwordHash: true },
    });
  }

  async updatePassword(
    schemaName: string,
    userId: string,
    passwordHash: string,
  ) {
    return this.db(schemaName).user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
      omit: { passwordHash: true },
    });
  }

  async updateStatus(schemaName: string, id: string, status: string) {
    return this.db(schemaName).user.update({
      where: { id },
      data: { status },
      omit: { passwordHash: true } as any,
    } as any);
  }

  async remove(schemaName: string, id: string) {
    return this.db(schemaName).user.delete({ where: { id } });
  }
}
