import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

enum OrderStatusDto {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatusDto })
  @IsEnum(OrderStatusDto)
  status: OrderStatusDto;

  @ApiPropertyOptional({ example: 'Cambio solicitado por el cliente' })
  @IsOptional()
  @IsString()
  notes?: string;
}
