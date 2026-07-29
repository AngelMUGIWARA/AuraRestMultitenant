import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SuspendTenantDto {
  @ApiPropertyOptional({ example: 'Pago vencido' })
  @IsOptional()
  @IsString()
  reason?: string;
}
