import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReservationResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    guestName: string;

    @ApiProperty()
    guestPhone: string;

    @ApiPropertyOptional()
    guestEmail?: string | null;

    @ApiProperty({ description: 'Fecha en formato YYYY-MM-DD (derivado de scheduledAt)' })
    date: string;

    @ApiProperty({ description: 'Hora en formato HH:MM (derivado de scheduledAt)' })
    time: string;

    @ApiProperty()
    partySize: number;

    @ApiProperty({ description: 'Duración de la reserva en minutos' })
    durationMinutes: number;

    @ApiProperty({ enum: ['PENDING', 'CONFIRMED', 'ARRIVED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] })
    status: string;

    @ApiProperty()
    branchId: string;

    @ApiProperty()
    tableId: string;

    @ApiPropertyOptional()
    notes?: string | null;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}