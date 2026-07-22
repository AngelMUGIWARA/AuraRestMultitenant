import { Injectable, NotFoundException } from '@nestjs/common';
import { ReservationRepository } from './reservations.repository';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationQueryDto } from './dto/reservation-query.dto';
import { ReservationStatus } from '../generated/prisma-tenant';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly reservationRepo: ReservationRepository,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(data: CreateReservationDto, schema: string, userId?: string) {
    const reservation = await this.reservationRepo.create(data, schema);
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
        }),
      });
    }
    return reservation;
  }

  async findAll(schema: string, query: ReservationQueryDto) {
    // El repo recibe los filtros limpios
    const filters: any = {};
    if (query.status) filters.status = query.status;
    if (query.branchId) filters.branchId = query.branchId;
    if (query.search) filters.search = query.search;

    const reservations = await this.reservationRepo.findAll(schema, filters);
    return { data: reservations, meta: { total: reservations.length } };
  }

  async findOne(id: string, schema: string) {
    const reservation = await this.reservationRepo.findById(id, schema);
    if (!reservation) throw new NotFoundException(`Reservación con ID ${id} no encontrada`);
    return reservation;
  }

  async updateStatus(id: string, status: ReservationStatus, schema: string, userId?: string) {
    const reservation = await this.findOne(id, schema);
    const updated = await this.reservationRepo.updateStatus(id, status, schema);
    if (reservation.branchId && userId) {
      this.activityLog.log(schema, {
        branchId: reservation.branchId,
        userId,
        action: 'RESERVATION_STATUS_CHANGED',
        entity: 'RESERVATION',
        entityId: id,
        changes: JSON.stringify({ from: reservation.status, to: status }),
      });
    }
    return updated;
  }

  async getStats(schema: string, branchId?: string) {
    // 1. Definir los filtros base respetando el multitenancy y la sucursal activa
    const filter: any = {};
    if (branchId) {
      filter.branchId = branchId;
    }
  
    // 2. Obtener todas las reservaciones mediante el repositorio
    const reservations = await this.reservationRepo.findAll(schema, filter);
  
    // 3. Calcular los agregados mapeando CONTRA EL ENUM REAL DE PRISMA (Mayúsculas)
    const totalToday = reservations.length;
    
    // CORREGIDO: Usamos el enum ReservationStatus importado de Prisma
    const confirmedToday = reservations.filter(r => r.status === ReservationStatus.CONFIRMED).length;
    const pendingConfirmation = reservations.filter(r => r.status === ReservationStatus.PENDING).length;
    const completedToday = reservations.filter(r => r.status === ReservationStatus.COMPLETED).length;
    const arrivedToday = reservations.filter(r => r.status === ReservationStatus.ARRIVED).length;
    const cancelledToday = reservations.filter(r => r.status === ReservationStatus.CANCELLED).length;
  
    // Métricas calculadas para proteger la vista de errores 'toFixed'
    const totalGuests = reservations.reduce((sum, r) => sum + (r.partySize || 0), 0);
    const averagePartySize = totalToday > 0 ? totalGuests / totalToday : 0;
  
    // Tasa de ocupación calculada de forma dinámica
    const occupancyRate = totalToday > 0 ? ((confirmedToday + arrivedToday) / totalToday) * 100 : 0;
  
    // 4. Retornar la estructura exacta mapeada limpia en minúsculas al front
    return {
      data: {
        totalToday,
        confirmedToday,
        pendingConfirmation,
        completedToday,
        arrivedToday,
        cancelledToday,
        averagePartySize,
        occupancyRate
      }
    };
  }
}