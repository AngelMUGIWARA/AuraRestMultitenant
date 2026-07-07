import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class KitchenQueueQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por sucursal' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
