import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ReservationRepository } from './reservations.repository';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationQueryDto } from './dto/reservation-query.dto';
import { ReservationStatus } from '../generated/prisma-tenant';
import { TenantPrismaService } from '../database/tenant-prisma.service';

interface AuthenticatedUser {
  id?: string;
  sub?: string;
  userId?: string;
  role?: string;
  branchId?: string;
}

@Injectable()
export class ReservationsService {
  constructor(
    private readonly reservationRepo: ReservationRepository,
    private readonly activityLog: ActivityLogService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  /**
   * Valida que el usuario tiene permisos para operar en la rama
   * OWNER puede acceder a cualquier rama
   * MANAGER, CASHIER, WAITER solo a su rama
   */
  private validateBranchAccess(
    user: AuthenticatedUser | undefined,
    branchId: string,
    actionName: string,
  ) {
    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const userRole = user.role?.toUpperCase() || 'WAITER';

    // OWNER puede acceder a cualquier rama
    if (userRole === 'OWNER') {
      return true;
    }

    // Otros roles solo acceden su rama
    if (userRole === 'MANAGER' || userRole === 'CASHIER' || userRole === 'WAITER') {
      if (!user.branchId) {
        throw new ForbiddenException(
          `Usuario sin rama asignada no puede ${actionName}`,
        );
      }

      if (user.branchId !== branchId) {
        throw new ForbiddenException(
          `Usuario solo puede ${actionName} en su rama`,
        );
      }

      return true;
    }

    throw new ForbiddenException(`Rol no reconocido: ${userRole}`);
  }

  /**
   * Crea una nueva reserva con validaciones y scope por rama
   */
  async create(
    data: CreateReservationDto,
    schema: string,
    userId?: string,
    user?: AuthenticatedUser,
  ) {
    // Validar acceso a la rama
    this.validateBranchAccess(user, data.branchId, 'crear reservas');

    const reservation = await this.reservationRepo.create(data, schema, userId);

    // Registrar en activity log
    if (data.branchId && userId) {
      this.activityLog.log(schema, {
        branchId: data.branchId,
        userId,
        action: 'RESERVATION_CREATED',
        entity: 'RESERVATION',
        entityId: reservation.id,
        changes: JSON.stringify({
          date: data.date,
          time: data.time,
          partySize: data.partySize,
          guestName: data.guestName,
          durationMinutes: data.durationMinutes || 60,
        }),
      });
    }

    return this.transformReservation(reservation);
  }

  /**
   * Lista todas las reservas con filtros y scope por rama
   */
  async findAll(
    schema: string,
    query: ReservationQueryDto,
    user?: AuthenticatedUser,
  ) {
    const userRole = user?.role?.toUpperCase() || 'WAITER';

    // Aplicar scope automático para roles limitados
    const filters: any = {};

    if (query.status) filters.status = query.status;
    if (query.search) filters.search = query.search;

    // Si el usuario tiene role limitado, forzar su branchId
    if (userRole === 'MANAGER' || userRole === 'CASHIER' || userRole === 'WAITER') {
      if (!user?.branchId) {
        throw new ForbiddenException(
          'Usuario sin rama asignada no puede listar reservas',
        );
      }
      filters.branchId = user.branchId;
    } else {
      // OWNER puede filtrar por rama si lo especifica
      if (query.branchId) filters.branchId = query.branchId;
    }

    const reservations = await this.reservationRepo.findAll(schema, filters);

    return {
      data: reservations.map((r) => this.transformReservation(r)),
      meta: { total: reservations.length },
    };
  }

  /**
   * Obtiene una reserva específica con validación de scope
   */
  async findOne(
    id: string,
    schema: string,
    user?: AuthenticatedUser,
  ) {
    const reservation = await this.reservationRepo.findById(id, schema);

    if (!reservation) {
      throw new NotFoundException(`Reservación con ID ${id} no encontrada`);
    }

    // Validar acceso a la rama si el usuario tiene role limitado
    const userRole = user?.role?.toUpperCase() || 'WAITER';
    if (
      userRole === 'MANAGER' ||
      userRole === 'CASHIER' ||
      userRole === 'WAITER'
    ) {
      this.validateBranchAccess(user, reservation.branchId, 'consultar esta reserva');
    }

    return this.transformReservation(reservation);
  }

  /**
   * Actualiza el estado de una reserva con validación de scope
   */
  async updateStatus(
    id: string,
    status: ReservationStatus,
    schema: string,
    userId?: string,
    user?: AuthenticatedUser,
  ) {
    // Obtener la reserva actual para validar permisos
    const reservation = await this.reservationRepo.findById(id, schema);

    if (!reservation) {
      throw new NotFoundException(`Reservación con ID ${id} no encontrada`);
    }

    // Validar acceso a la rama
    const userRole = user?.role?.toUpperCase() || 'WAITER';
    if (
      userRole === 'MANAGER' ||
      userRole === 'CASHIER' ||
      userRole === 'WAITER'
    ) {
      this.validateBranchAccess(
        user,
        reservation.branchId,
        'cambiar estado de reserva',
      );
    }

    // Actualizar estado
    const updated = await this.reservationRepo.updateStatus(
      id,
      status,
      schema,
    );

    // Registrar en activity log
    if (reservation.branchId && userId) {
      this.activityLog.log(schema, {
        branchId: reservation.branchId,
        userId,
        action: 'RESERVATION_STATUS_CHANGED',
        entity: 'RESERVATION',
        entityId: id,
        changes: JSON.stringify({
          from: reservation.status,
          to: status,
        }),
      });
    }

    return this.transformReservation(updated);
  }

  /**
   * Obtiene estadísticas de reservas
   */
  async getStats(schema: string, branchId?: string, user?: AuthenticatedUser) {
    const client = this.tenantPrisma.getClient(schema);

    // Aplicar scope automático para roles limitados
    const userRole = user?.role?.toUpperCase() || 'WAITER';
    let effectiveBranchId = branchId;

    if (userRole === 'MANAGER' || userRole === 'CASHIER' || userRole === 'WAITER') {
      if (!user?.branchId) {
        throw new ForbiddenException(
          'Usuario sin rama asignada no puede ver estadísticas',
        );
      }
      effectiveBranchId = user.branchId;
    }

    const filter: any = {};
    if (effectiveBranchId) {
      filter.branchId = effectiveBranchId;
    }

    const reservations = await this.reservationRepo.findAll(schema, filter);

    const totalToday = reservations.length;
    const confirmedToday = reservations.filter(
      (r) => r.status === 'CONFIRMED',
    ).length;
    const pendingConfirmation = reservations.filter(
      (r) => r.status === 'PENDING',
    ).length;
    const completedToday = reservations.filter(
      (r) => r.status === 'COMPLETED',
    ).length;
    const arrivedToday = reservations.filter(
      (r) => r.status === 'ARRIVED',
    ).length;
    const cancelledToday = reservations.filter(
      (r) => r.status === 'CANCELLED',
    ).length;
    const noShowToday = reservations.filter(
      (r) => r.status === 'NO_SHOW',
    ).length;

    const totalGuests = reservations.reduce(
      (sum, r) => sum + (r.partySize || 0),
      0,
    );
    const averagePartySize = totalToday > 0 ? totalGuests / totalToday : 0;

    const occupancyRate =
      totalToday > 0
        ? ((confirmedToday + arrivedToday) / totalToday) * 100
        : 0;

    return {
      data: {
        totalToday,
        confirmedToday,
        pendingConfirmation,
        completedToday,
        arrivedToday,
        cancelledToday,
        noShowToday,
        averagePartySize,
        occupancyRate,
      },
    };
  }

  /**
   * Transforma una reserva de Prisma a DTO
   * Convierte scheduledAt en date y time (usando UTC para consistencia)
   */
  private transformReservation(reservation: any) {
    const scheduledAt = new Date(reservation.scheduledAt);

    // Formatear date (YYYY-MM-DD) y time (HH:MM) usando UTC
    const isoString = scheduledAt.toISOString();
    const date = isoString.split('T')[0];
    const time = isoString.split('T')[1].slice(0, 5);

    return {
      id: reservation.id,
      guestName: reservation.guestName,
      guestPhone: reservation.guestPhone,
      guestEmail: reservation.guestEmail,
      date,
      time,
      partySize: reservation.partySize,
      durationMinutes: reservation.durationMinutes,
      status: reservation.status,
      tableId: reservation.tableId,
      branchId: reservation.branchId,
      notes: reservation.notes,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    };
  }
}
