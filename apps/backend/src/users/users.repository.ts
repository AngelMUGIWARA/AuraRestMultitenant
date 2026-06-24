import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
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

  async findById(schemaName: string, id: string) {
    return this.db(schemaName).user.findUnique({
      where: { id },
      omit: { passwordHash: true },
    });
  }

  async findByEmail(schemaName: string, email: string) {
    return this.db(schemaName).user.findUnique({ where: { email } });
  }

  async create(schemaName: string, dto: CreateUserDto) {
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
    dto: { name: string; email: string; role: string },
  ) {
    // Genera una contraseña aleatoria temporal
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
    const passwordHash = await bcrypt.hash(
      tempPassword,
      Number(process.env.BCRYPT_ROUNDS ?? 10),
    );

    // Crea el usuario con contraseña temporal. En producción deberíamos enviar un correo con un token.
    const user = await this.db(schemaName).user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role as any,
        status: 'ACTIVE',
      },
      omit: { passwordHash: true },
    });

    // Si se proporcionó branchId, creamos la asignación userBranch
    if ((dto as any).branchId) {
      // Intentamos encontrar un role por nombre para asignar
      const roleRecord = await this.db(schemaName).role.findUnique({
        where: { name: dto.role as any },
      });
      if (roleRecord) {
        await this.db(schemaName).userBranch.create({
          data: {
            userId: user.id,
            branchId: (dto as any).branchId,
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
