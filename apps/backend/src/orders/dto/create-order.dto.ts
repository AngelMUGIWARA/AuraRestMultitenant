import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested, ArrayMinSize } from 'class-validator';

enum OrderTypeDto {
  DINE_IN = 'DINE_IN',
  TAKEOUT = 'TAKEOUT',
  DELIVERY = 'DELIVERY',
}

class CreateOrderItemDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  menuItemId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Sin cebolla' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderDto {
  @ApiProperty({ enum: OrderTypeDto, default: OrderTypeDto.DINE_IN })
  @IsEnum(OrderTypeDto)
  type: OrderTypeDto;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiPropertyOptional({ example: 'Preferencia cerca de la ventana' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Sucursal explícita. Requerida para TAKEOUT/DELIVERY sin mesa.', example: 'clx...' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
