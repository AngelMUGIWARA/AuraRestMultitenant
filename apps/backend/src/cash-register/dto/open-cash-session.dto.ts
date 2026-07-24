import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class OpenCashSessionDto {
  @ApiProperty({
    description: 'ID de la caja',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  registerId!: string;

  @ApiProperty({
    description: 'Monto inicial de la caja',
    example: 1000.00,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  openingFloat!: number;
}
