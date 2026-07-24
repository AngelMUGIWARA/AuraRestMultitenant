import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { KitchenItemStatus } from '../../generated/prisma-tenant';

export class UpdateKitchenItemStatusDto {
  @ApiProperty({
    enum: KitchenItemStatus,
    example: KitchenItemStatus.PREPARING,
    description: 'Nuevo estado del item de cocina',
  })
  @IsEnum(KitchenItemStatus)
  @IsNotEmpty()
  status!: KitchenItemStatus;

  @ApiProperty({
    description: 'Versión actual del item (optimistic locking)',
    example: 1,
  })
  @IsInt()
  @Min(0)
  version!: number;

  @ApiPropertyOptional({
    description: 'Motivo del cambio (requerido para CANCELLED)',
    example: 'Ingrediente agotado',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
