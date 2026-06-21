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
}