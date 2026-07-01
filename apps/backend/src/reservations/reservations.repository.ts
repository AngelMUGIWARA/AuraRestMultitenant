import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationStatus } from '../generated/prisma-tenant';

@Injectable()
export class ReservationRepository {
  constructor(private readonly prisma: TenantPrismaService) {}

  /**
   * Crea una nueva reserva en el esquema (tenant) correspondiente
   */
  async create(data: CreateReservationDto, schema: string) {
    const client = this.prisma.getClient(schema);
    return client.reservation.create({
      data: {
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        guestEmail: data.guestEmail,
        partySize: data.partySize,
        scheduledAt: new Date(`${data.date}T${data.time}:00`), 
        notes: data.notes,
        branchId: data.branchId,
        tableId: data.tableId, // Asegúrate de incluir esto
      },
    });
  }

  /**
   * Busca todas las reservas filtradas por tenant y otros criterios opcionales
   */
  async findAll(schema: string, filters: any) {
    const client = this.prisma.getClient(schema);
    
    const whereClause: any = {};
  
    // Si viene una sucursal en el filtro
    if (filters?.branchId) {
      whereClause.branchId = filters.branchId;
    }
  
    // Si viene un estado en los filtros, lo transformamos a mayúsculas para cumplir con Prisma
    if (filters?.status && filters.status !== 'all') {
      whereClause.status = filters.status.toUpperCase(); // 'pending' -> 'PENDING'
    }
  
    // Si viene una búsqueda por texto
    if (filters?.search) {
      whereClause.OR = [
        { guestName: { contains: filters.search, mode: 'insensitive' } },
        { confirmationCode: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
  
    return client.reservation.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc"
      }
    });
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

  async updateStatus(id: string, status: ReservationStatus, schema: string) { // Cambia string por ReservationStatus
    const client = this.prisma.getClient(schema);
    return client.reservation.update({
      where: { id },
      data: { status }, // Ahora TypeScript coincidirá con el tipo esperado
    });
  }
}