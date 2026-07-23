import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min, Max } from 'class-validator';

export class UpdatePriceDto {
  @ApiProperty({ description: 'Nuevo precio del producto (debe ser un número finito >= 0)' })
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(999999.99)
  price: number;
}
