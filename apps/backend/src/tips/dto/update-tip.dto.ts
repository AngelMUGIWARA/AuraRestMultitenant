import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { TipMethod } from '../../generated/prisma-tenant';

export class UpdateTipDto {
  @ApiProperty({ enum: TipMethod })
  @IsEnum(TipMethod)
  method: TipMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty()
  @IsNumber()
  expectedVersion: number;
}
