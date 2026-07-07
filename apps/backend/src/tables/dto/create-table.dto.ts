import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsNotEmpty, Min } from 'class-validator';

export class CreateTableDto {
  @ApiProperty({ example: 5, description: 'Número de la mesa' })
  @IsInt()
  @IsNotEmpty()
  number: number;

  @ApiPropertyOptional({ example: 'Mesa junto a la ventana' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 4, minimum: 1, description: 'Capacidad mínima de 1 persona' })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({ example: 'clx...' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ example: 'Terraza' })
  @IsString()
  @IsOptional()
  locationZone?: string;
}