import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class SalesReportQueryDto {
    @ApiPropertyOptional({
        description: 'Fecha de inicio del período (ISO 8601)',
        example: '2025-01-01',
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'Fecha de fin del período (ISO 8601)',
        example: '2025-12-31',
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({
        description: 'ID de la sucursal (omitir para Global)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiPropertyOptional({
        description:
            'Solo para /peak-hours: filtra por nombre de platillo (coincidencia parcial, insensible a mayúsculas). Si no hay match, el resultado viene vacío en vez de fallar.',
        example: 'pizza',
    })
    @IsOptional()
    @IsString()
    menuItem?: string;

    @ApiPropertyOptional({
        description:
            'Solo para /sales: período estándar que reemplaza startDate/endDate (daily | weekly | monthly | yearly). Un valor no reconocido se ignora silenciosamente y se usa el comportamiento por defecto.',
        example: 'weekly',
    })
    @IsOptional()
    @IsString()
    period?: string;
}