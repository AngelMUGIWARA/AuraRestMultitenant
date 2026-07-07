import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsDateString, IsOptional, Min, IsEmail } from 'class-validator';

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

  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: '19:00' })
  @IsString()
  @IsNotEmpty()
  time: string;

  @ApiPropertyOptional({ example: 'Mesa cerca de la ventana' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: 'clx...' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 'clx...' })
  @IsString()
  @IsNotEmpty()
  tableId: string;
}