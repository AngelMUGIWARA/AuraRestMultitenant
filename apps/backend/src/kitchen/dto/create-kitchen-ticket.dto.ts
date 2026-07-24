import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum KitchenPriorityDto {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateKitchenTicketDto {
  @ApiProperty({
    description: 'ID de la orden a enviar a cocina',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiPropertyOptional({
    enum: KitchenPriorityDto,
    default: KitchenPriorityDto.NORMAL,
    description: 'Prioridad del ticket',
  })
  @IsOptional()
  @IsEnum(KitchenPriorityDto)
  priority?: KitchenPriorityDto;

  @ApiPropertyOptional({
    description: 'Notas generales del ticket para cocina',
    example: 'Cliente con alergia a mariscos',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
