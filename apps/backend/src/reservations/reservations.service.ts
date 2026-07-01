import { Injectable, NotFoundException } from '@nestjs/common';
import { ReservationRepository } from './reservations.repository';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationQueryDto } from './dto/reservation-query.dto';
import { ReservationStatus } from '../generated/prisma-tenant';

@Injectable()
export class ReservationsService {
  // Ahora inyectamos el repositorio, no la conexión directa a la base de datos
  constructor(private readonly reservationRepo: ReservationRepository) {}

  async create(data: CreateReservationDto, schema: string) {
    // Aquí puedes agregar lógica de negocio antes de llamar al repo
    // Por ejemplo: validar que la fecha no sea en el pasado
    return await this.reservationRepo.create(data, schema);
  }

  async findAll(schema: string, query: ReservationQueryDto) {
    // El repo recibe los filtros limpios
    const filters: any = {};
    if (query.status) filters.status = query.status;
    if (query.branchId) filters.branchId = query.branchId;

    const reservations = await this.reservationRepo.findAll(schema, filters);
    return { data: reservations, meta: { total: reservations.length } };
  }

  async findOne(id: string, schema: string) {
    const reservation = await this.reservationRepo.findById(id, schema);
    if (!reservation) throw new NotFoundException(`Reservación con ID ${id} no encontrada`);
    return reservation;
  }

  async updateStatus(id: string, status: ReservationStatus, schema: string) {
    // Validar existencia antes de actualizar
    await this.findOne(id, schema);
    return await this.reservationRepo.updateStatus(id, status, schema);
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