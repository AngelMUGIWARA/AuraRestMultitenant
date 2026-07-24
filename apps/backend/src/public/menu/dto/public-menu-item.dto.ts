import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicMenuItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiProperty()
  isAvailable: boolean;

  @ApiPropertyOptional({ description: 'Estado: AVAILABLE, UNAVAILABLE, OUT_OF_STOCK' })
  status?: string;

  @ApiPropertyOptional()
  categoryId?: string;
}
