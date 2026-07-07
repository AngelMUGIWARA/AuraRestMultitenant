import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReservationQueryDto {

    @ApiPropertyOptional({ default: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    page?: number;

    @ApiPropertyOptional({ default: 20, minimum: 1 })
    @IsOptional()
    @Type(() => Number) 
    @IsInt()
    limit?: number; 

    @ApiPropertyOptional({ description: 'Filtrar por estado' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: 'Buscar por nombre de cliente' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Filtrar por sucursal' })
    @IsOptional()
    @IsString()
    branchId?: string;
}