import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsUUID, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class ReservationQueryDto {
    @ApiPropertyOptional({ default: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;

    @ApiPropertyOptional({ description: 'Filtrar por estado (PENDING, CONFIRMED, ARRIVED, COMPLETED, CANCELLED, NO_SHOW)' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'Buscar por nombre, teléfono o email del cliente' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Filtrar por sucursal (requerido para roles limitados)' })
    @IsOptional()
    @IsUUID()
    branchId?: string;

    @ApiPropertyOptional({ description: 'Fecha inicio en formato YYYY-MM-DD' })
    @IsOptional()
    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateFrom debe estar en formato YYYY-MM-DD' })
    dateFrom?: string;

    @ApiPropertyOptional({ description: 'Fecha fin en formato YYYY-MM-DD' })
    @IsOptional()
    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateTo debe estar en formato YYYY-MM-DD' })
    dateTo?: string;
}