import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class UpdatePriceDto {
  @ApiProperty()
  @IsNumber()
  price: number;
}
