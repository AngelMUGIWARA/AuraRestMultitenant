import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsIn } from 'class-validator';

export type ExportReportType = 'sales' | 'products' | 'payments' | 'peak-hours';

export class ExportReportQueryDto {
  @ApiProperty({
    description: 'Tipo de reporte a exportar',
    enum: ['sales', 'products', 'payments', 'peak-hours'],
    example: 'sales',
  })
  @IsIn(['sales', 'products', 'payments', 'peak-hours'])
  type: ExportReportType;

  @ApiPropertyOptional({
    description: 'Fecha de inicio (ISO 8601)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin (ISO 8601)',
    example: '2026-12-31',
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
}
