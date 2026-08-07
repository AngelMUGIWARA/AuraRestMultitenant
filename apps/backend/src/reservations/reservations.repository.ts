import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationStatus, Prisma } from '../generated/prisma-tenant';

@Injectable()
export class ReservationRepository {
  constructor(private readonly prisma: TenantPrismaService) {}

  /**
   * Valida que la mesa existe, está activa, pertenece a la rama correcta
   * y que la capacidad es suficiente
   */
  private async validateTable(
    client: Prisma.TransactionClient,
    tableId: string,
    branchId: string,
    partySize: number,
  ) {
    const table = await client.restaurantTable.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw new NotFoundException('Mesa no encontrada');
    }

    if (table.branchId !== branchId) {
      throw new ForbiddenException('Mesa pertenece a otra sucursal');
    }

    if (!table.isActive) {
      throw new BadRequestException('Mesa está inactiva');
    }

    if (table.status === 'MAINTENANCE') {
      throw new BadRequestException('Mesa en mantenimiento');
    }

    if (partySize > table.capacity) {
      throw new BadRequestException(
        `Capacidad insuficiente: mesa soporta ${table.capacity} personas, se solicitaron ${partySize}`,
      );
    }

    return table;
  }

  /**
   * Busca si existe una reserva conflictiva en el intervalo especificado.
   *
   * Detecta solapamiento verificando que:
   * - scheduled_at < newEnd (la existente comienza antes de que termine la nueva)
   * Y
   * - scheduled_at + (duration_minutes * interval '1 minute') > newStart (la existente termina después de que comienza la nueva)
   *
   * Esto previene todos los casos de solapamiento.
   */
  private async findOverlappingReservation(
    client: Prisma.TransactionClient,
    branchId: string,
    tableId: string,
    newStart: Date,
    newEnd: Date,
    excludeReservationId?: string,
  ) {
    const excludeClause = excludeReservationId
      ? Prisma.sql`AND id <> ${excludeReservationId}`
      : Prisma.empty;

    const conflict = await client.$queryRaw<Array<{
      id: string;
      scheduledAt: Date;
      durationMinutes: number;
    }>>(Prisma.sql`
      SELECT id, scheduled_at as "scheduledAt", duration_minutes as "durationMinutes"
      FROM reservations
      WHERE
        table_id = ${tableId}
        AND branch_id = ${branchId}
        AND status IN ('PENDING', 'CONFIRMED', 'ARRIVED')
        AND scheduled_at < ${newEnd}
        AND scheduled_at + (duration_minutes * INTERVAL '1 minute') > ${newStart}
        ${excludeClause}
      LIMIT 1
    `);

    return conflict?.length > 0 ? conflict[0] : null;
  }

  /**
   * Crea una nueva reserva dentro de una transacción serializable
   * con reintentos automáticos en caso de conflicto.
   *
   * IMPORTANTE - Timezone:
   * El frontend debe enviar date y time en UTC.
   * Internamente se persisten como UTC en PostgreSQL.
   * No se realizan conversiones de timezone en el backend;
   * la responsabilidad es del cliente.
   *
   * Formato esperado:
   *   date: "2026-07-25" (YYYY-MM-DD)
   *   time: "19:00" (HH:MM, UTC)
   *   scheduledAt: 2026-07-25T19:00:00.000Z (DateTime UTC)
   */
  async create(
    data: CreateReservationDto,
    schema: string,
    userId?: string,
  ) {
    const client = this.prisma.getClient(schema);
    // Construir UTC explícitamente: date + time son UTC según contrato
    const scheduledAt = new Date(`${data.date}T${data.time}:00.000Z`);
    const durationMinutes = data.durationMinutes || 60;

    // Validaciones previas
    const now = new Date();
    if (scheduledAt <= now) {
      throw new BadRequestException(
        'La fecha y hora de la reserva debe ser en el futuro',
      );
    }

    if (durationMinutes < 15 || durationMinutes > 480) {
      throw new BadRequestException(
        'La duración debe estar entre 15 y 480 minutos',
      );
    }

    // Calcular fecha final de la reserva para detección de conflictos
    const newEnd = new Date(scheduledAt.getTime() + durationMinutes * 60000);

    // Implementar transacción serializable con reintentos
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await client.$transaction(
          async (tx) => {
            // 1. Validar mesa
            await this.validateTable(
              tx,
              data.tableId,
              data.branchId,
              data.partySize,
            );

            // 2. Buscar conflictos con la fórmula correcta de solapamiento
            const existingConflict = await this.findOverlappingReservation(
              tx,
              data.branchId,
              data.tableId,
              scheduledAt,
              newEnd,
            );

            if (existingConflict) {
              const existingEnd = new Date(
                existingConflict.scheduledAt.getTime() +
                  existingConflict.durationMinutes * 60000,
              );
              throw new ConflictException(
                `Hora no disponible: ya existe una reserva en la mesa desde ${existingConflict.scheduledAt.toLocaleTimeString()} hasta ${existingEnd.toLocaleTimeString()}`,
              );
            }

            // 3. Crear la reserva
            return await tx.reservation.create({
              data: {
                guestName: data.guestName,
                guestPhone: data.guestPhone,
                guestEmail: data.guestEmail,
                partySize: data.partySize,
                scheduledAt,
                durationMinutes,
                status: 'PENDING',
                branchId: data.branchId,
                tableId: data.tableId,
                notes: data.notes,
                userId,
              },
            });
          },
          {
            isolationLevel: 'Serializable',
            timeout: 5000,
          },
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Reintenta solo si es error de serialización P2034 de Prisma
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034'
        ) {
          if (attempt < maxRetries - 1) {
            // Backoff exponencial: 100ms, 200ms, 400ms
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, attempt) * 100),
            );
            continue;
          }
        }

        // Otros errores: no reintentar (ConflictException, ValidationError, etc)
        throw error;
      }
    }

    // Si llegamos aquí, agotamos reintentos en P2034
    throw new BadRequestException(
      'No se pudo crear la reserva después de múltiples intentos de transacción',
    );
  }

  /**
   * Busca todas las reservas filtradas por tenant y otros criterios
   */
  async findAll(schema: string, filters: any) {
    const client = this.prisma.getClient(schema);

    const whereClause: any = {};

    if (filters?.branchId) {
      whereClause.branchId = filters.branchId;
    }

    if (filters?.status && filters.status !== 'all') {
      whereClause.status = filters.status.toUpperCase();
    }

    if (filters?.search) {
      whereClause.OR = [
        { guestName: { contains: filters.search, mode: 'insensitive' } },
        { guestPhone: { contains: filters.search, mode: 'insensitive' } },
        { guestEmail: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Agregar filtros de fecha si se proporcionan
    if (filters?.dateFrom || filters?.dateTo) {
      whereClause.scheduledAt = {};
      if (filters.dateFrom) {
        whereClause.scheduledAt.gte = new Date(`${filters.dateFrom}T00:00:00.000Z`);
      }
      if (filters.dateTo) {
        whereClause.scheduledAt.lte = new Date(`${filters.dateTo}T23:59:59.999Z`);
      }
    }

    // Paginación
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      client.reservation.findMany({
        where: whereClause,
        orderBy: {
          scheduledAt: 'desc',
        },
        skip,
        take: limit,
      }),
      client.reservation.count({ where: whereClause }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Busca una reserva específica por su ID
   */
  async findById(id: string, schema: string) {
    const client = this.prisma.getClient(schema);
    return client.reservation.findUnique({
      where: { id },
    });
  }

  /**
   * Valida una transición de estado de acuerdo a la máquina de estados
   */
  private validateStatusTransition(
    currentStatus: ReservationStatus,
    newStatus: ReservationStatus,
  ) {
    const validTransitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['ARRIVED', 'CANCELLED', 'NO_SHOW'],
      ARRIVED: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
      NO_SHOW: [],
    };

    if (currentStatus === newStatus) {
      // Permitir no-op idempotente
      return true;
    }

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transición no permitida: ${currentStatus} → ${newStatus}`,
      );
    }

    return true;
  }

  /**
   * Actualiza el estado de una reserva y la mesa si es necesario
   * Debe ejecutarse dentro de una transacción
   */
  async updateStatus(
    id: string,
    newStatus: ReservationStatus,
    schema: string,
  ) {
    const client = this.prisma.getClient(schema);

    return await client.$transaction(
      async (tx) => {
        // 1. Obtener la reserva actual
        const reservation = await tx.reservation.findUnique({
          where: { id },
          include: { table: true },
        });

        if (!reservation) {
          throw new NotFoundException('Reservación no encontrada');
        }

        // 2. Validar transición de estado
        this.validateStatusTransition(
          reservation.status as ReservationStatus,
          newStatus,
        );

        // 3. Aplicar cambios especiales según el nuevo estado
        let tableUpdate: Prisma.RestaurantTableUpdateInput | null = null;

        if (newStatus === 'ARRIVED') {
          // Al llegar, ocupar la mesa
          tableUpdate = { status: 'OCCUPIED' };
        } else if (newStatus === 'COMPLETED') {
          // Al completar, liberar la mesa
          // Pero primero verificar que no hay órdenes activas (explícitamente)
          //
          // Órdenes activas son aquellas que NO están en estados finales:
          // PENDING, CONFIRMED, IN_PROGRESS, READY, DELIVERED
          //
          // Estados finales que no bloquean liberación:
          // PAID, CANCELLED
          //
          // La decisión: permitir completar Reservation incluso con orden activa,
          // pero mantener mesa OCCUPIED. La mesa se liberará cuando se pague/cancele la orden.
          const activeOrders = await tx.order.findFirst({
            where: {
              tableId: reservation.tableId,
              status: {
                in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'DELIVERED'],
              },
            },
          });

          // Si no hay órdenes activas, liberar la mesa
          // Si hay órdenes activas, mantener OCCUPIED
          // La mesa será liberada por el flujo de Orders cuando se pague
          if (!activeOrders && reservation.table?.status !== 'MAINTENANCE') {
            tableUpdate = { status: 'AVAILABLE' };
          }
        }

        // 4. Validación especial para NO_SHOW
        if (newStatus === 'NO_SHOW') {
          // Solo permitir NO_SHOW desde CONFIRMED
          if (reservation.status !== 'CONFIRMED') {
            throw new BadRequestException(
              'NO_SHOW solo puede establecerse desde estado CONFIRMED',
            );
          }

          // Verificar que ya pasó la hora
          if (reservation.scheduledAt > new Date()) {
            throw new BadRequestException(
              'NO_SHOW solo puede marcarse después de la hora programada',
            );
          }
        }

        // 5. Actualizar la reserva
        const updated = await tx.reservation.update({
          where: { id },
          data: { status: newStatus },
        });

        // 6. Actualizar la mesa si es necesario
        if (tableUpdate) {
          await tx.restaurantTable.update({
            where: { id: reservation.tableId },
            data: tableUpdate,
          });
        }

        return updated;
      },
      {
        isolationLevel: 'Serializable',
        timeout: 5000,
      },
    );
  }
}
