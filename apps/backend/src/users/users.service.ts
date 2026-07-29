import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  PaginatedUsersDto,
  UserResponseDto,
  UserStatsDto,
} from './dto/user-response.dto';
import { UsersRepository } from './users.repository';
import {
  INVITATION_NOTIFIER,
  InvitationNotifier,
} from '../notifications/invitation-notifier.interface';

const TEMP_PASSWORD_BYTES = 16;

/**
 * Capa de lógica de negocio para Users.
 * Nunca accede a la BD directamente — siempre delega al Repository.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly repo: UsersRepository,
    @Inject(INVITATION_NOTIFIER)
    private readonly invitationNotifier: InvitationNotifier,
  ) {}

  async findAll(
    schemaName: string,
    pagination: PaginationDto,
  ): Promise<PaginatedUsersDto> {
    const { page = 1, limit = 20 } = pagination;
    const { data, total } = await this.repo.findAll(schemaName, {
      skip: pagination.skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats(schemaName: string): Promise<UserStatsDto> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { total, byStatus, byRole, pending, newSince } =
      await this.repo.getStats(schemaName, startOfMonth);

    const countByStatus = (status: string) =>
      byStatus.find((s) => s.status === status)?._count._all ?? 0;

    const countByRole = (...roles: string[]) =>
      byRole
        .filter((r) => roles.includes(r.role))
        .reduce((sum, r) => sum + r._count._all, 0);

    return {
      totalUsers: total,
      activeUsers: countByStatus('ACTIVE'),
      inactiveUsers: countByStatus('INACTIVE'),
      pendingUsers: pending,
      adminCount: countByRole('OWNER', 'ADMIN'),
      managerCount: countByRole('MANAGER'),
      staffCount: countByRole('WAITER', 'CASHIER', 'CHEF', 'KITCHEN_STAFF'),
      newThisMonth: newSince,
    };
  }

  async findOne(schemaName: string, id: string): Promise<UserResponseDto> {
    const user = await this.repo.findById(schemaName, id);
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return user;
  }

  async create(
    schemaName: string,
    dto: CreateUserDto,
  ): Promise<UserResponseDto> {
    const existing = await this.repo.findByEmail(schemaName, dto.email);
    if (existing) {
      throw new ConflictException(`El email ${dto.email} ya está registrado`);
    }
    return this.repo.create(schemaName, dto);
  }

  async invite(schemaName: string, dto: any): Promise<UserResponseDto> {
    const existing = await this.repo.findByEmail(schemaName, dto.email);
    if (existing) {
      throw new ConflictException(`El email ${dto.email} ya está registrado`);
    }

    this.invitationNotifier.assertAvailable();

    const tempPassword = randomBytes(TEMP_PASSWORD_BYTES)
      .toString('base64url')
      .slice(0, 20);

    const passwordHash = await bcrypt.hash(
      tempPassword,
      Number(process.env.BCRYPT_ROUNDS ?? 10),
    );

    const user = await this.repo.createInvite(schemaName, {
      name: dto.name,
      email: dto.email,
      role: dto.role,
      passwordHash,
      branchId: dto.branchId,
    });

    try {
      await this.invitationNotifier.sendInvitation({
        name: dto.name,
        email: dto.email,
        temporaryPassword: tempPassword,
      });
    } catch (err) {
      this.logger.warn(
        `Fallo al enviar invitación a ${dto.email}, deshaciendo creación de usuario: ${user.id}`,
      );
      await this.repo.remove(schemaName, user.id).catch(() => {});
      throw err;
    }

    return user;
  }

  async update(
    schemaName: string,
    id: string,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    await this.findOne(schemaName, id);
    return this.repo.update(schemaName, id, dto);
  }

  async remove(schemaName: string, id: string): Promise<void> {
    await this.findOne(schemaName, id);
    await this.repo.remove(schemaName, id);
  }

  async changeStatus(schemaName: string, id: string, status: string) {
    await this.findOne(schemaName, id);
    return this.repo.updateStatus(schemaName, id, status);
  }
}
