import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsUUID } from 'class-validator';
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
}