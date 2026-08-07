import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsOptional, Min, Max, IsEmail, Matches } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s\-']+$/, {
    message: 'El nombre solo puede contener letras, espacios, guiones y apóstrofes',
  })
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
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe estar en formato YYYY-MM-DD',
  })
  date: string;

  @ApiProperty({ example: '19:00', description: 'Hora en formato HH:MM' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'La hora debe estar en formato HH:MM',
  })
  time: string;

  @ApiPropertyOptional({ example: 60, minimum: 15, maximum: 480, description: 'Duración de la reserva en minutos (default: 60)' })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 'Mesa cerca de la ventana, sin nueces' })
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