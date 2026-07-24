import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListReceiptsQueryDto {
  @ApiPropertyOptional({ description: 'Número de página', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Elementos por página', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filtrar por folio del comprobante', example: 'TKT-000001' })
  @IsOptional()
  @IsString()
  folio?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID de orden' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Fecha de inicio (ISO 8601)', example: '2026-07-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha de fin (ISO 8601)', example: '2026-07-31T23:59:59.999Z' })
  @IsOptional()
  @IsString()
  dateTo?: string;
}
