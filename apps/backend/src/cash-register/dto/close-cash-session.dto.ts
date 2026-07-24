import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CloseCashSessionDto {
  @ApiProperty({
    description: 'Efectivo contado en caja al cierre',
    example: 1500.00,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  countedCash!: number;

  @ApiProperty({
    description: 'Versión actual de la sesión (optimistic locking)',
    example: 1,
  })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  version!: number;
}
