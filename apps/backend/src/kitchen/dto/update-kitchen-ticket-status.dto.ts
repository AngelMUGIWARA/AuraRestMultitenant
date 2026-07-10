import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateKitchenTicketStatusDto {
  @ApiProperty({ example: 'IN_PROGRESS', description: 'Nuevo estado del ticket de cocina' })
  @IsString()
  @IsNotEmpty()
  status: string;
}
