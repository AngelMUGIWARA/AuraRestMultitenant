import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ApplyDiscountDto {
  @ApiProperty({ description: 'ID del descuento a aplicar', example: 'clx...' })
  @IsString()
  @IsNotEmpty()
  discountId: string;
}
