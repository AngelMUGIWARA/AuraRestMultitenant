import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateBranchDto {
  @ApiProperty({ example: 'Sucursal Centro' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateBranchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BranchFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Busca por nombre o dirección' })
  @IsOptional()
  @IsString()
  search?: string;

  // 'maintenance' se acepta pero no filtra nada: el modelo Branch todavía
  // no tiene ese estado, solo isActive. Se admite el valor para que el
  // frontend (que sí lo ofrece como filtro) no reciba un 400.
  @ApiPropertyOptional({ enum: ['active', 'inactive', 'maintenance'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'maintenance'])
  status?: 'active' | 'inactive' | 'maintenance';
}

export class BranchResponseDto {}

export class PaginatedBranchesDto {
  @ApiProperty({ type: [BranchResponseDto] })
  data: BranchResponseDto[];

  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

export class BranchStatsResponseDto {
  @ApiProperty() totalBranches: number;
  @ApiProperty() activeBranches: number;
  @ApiProperty() inactiveBranches: number;

  @ApiProperty({
    description:
      'Siempre 0: el modelo Branch aún no tiene un estado de mantenimiento.',
  })
  maintenanceBranches: number;

  @ApiProperty({
    description: 'Siempre 0: el modelo Branch aún no registra capacidad.',
  })
  totalCapacity: number;

  @ApiProperty({
    description: 'Siempre 0: el modelo Branch aún no registra calificaciones.',
  })
  avgRating: number;
}
