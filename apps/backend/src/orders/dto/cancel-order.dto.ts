import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelOrderDto {
  @ApiPropertyOptional({ example: 'El cliente canceló el pedido' })
  @IsOptional()
  @IsString()
  reason?: string;
}
