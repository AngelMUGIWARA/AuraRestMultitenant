import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsDateString, IsOptional, Min, Max, IsEmail } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  guestName: string;

  @ApiProperty({ example: '+52 55 1234 5678' })
  @IsString()
  @IsNotEmpty()
  guestPhone: string;

  @ApiPropertyOptional({ example: 'juan@example.com' })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiProperty({ example: 4, minimum: 1 })
  @IsInt()
  @Min(1)
  partySize: number;

  @ApiProperty({ example: '2026-07-15', description: 'Fecha en formato YYYY-MM-DD' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: '19:00', description: 'Hora en formato HH:MM' })
  @IsString()
  @IsNotEmpty()
  time: string;

  @ApiPropertyOptional({ example: 60, minimum: 15, maximum: 480, description: 'Duración de la reserva en minutos (default: 60)' })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 'Mesa cerca de la ventana' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: 'clx...', description: 'ID de la sucursal' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 'clx...', description: 'ID de la mesa' })
  @IsString()
  @IsNotEmpty()
  tableId: string;
}