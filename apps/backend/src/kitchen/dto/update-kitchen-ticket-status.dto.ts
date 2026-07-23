import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { KitchenTicketStatus } from '../../generated/prisma-tenant';

export class UpdateKitchenTicketStatusDto {
  @ApiProperty({ enum: KitchenTicketStatus, example: KitchenTicketStatus.IN_PROGRESS, description: 'Nuevo estado del ticket de cocina' })
  @IsEnum(KitchenTicketStatus)
  @IsNotEmpty()
  status: KitchenTicketStatus;
}
