import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MenuResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  price: number;

  @ApiProperty()
  categoryId: string;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedMenusDto {
  @ApiProperty({ type: [MenuResponseDto] })
  data: MenuResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
