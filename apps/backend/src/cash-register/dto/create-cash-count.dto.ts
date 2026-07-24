import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCashCountDto {
  @ApiProperty({
    description: 'Efectivo contado físicamente',
    example: 1500.00,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  countedCash!: number;

  @ApiPropertyOptional({
    description: 'Notas del arqueo',
    example: 'Conteo correcto, sin diferencias',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Versión actual de la sesión (optimistic locking)',
    example: 1,
  })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  version!: number;
}
