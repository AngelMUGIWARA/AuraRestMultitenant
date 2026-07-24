import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PublicMenuItemDto } from './public-menu-item.dto';

export class PublicCategoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ type: [PublicMenuItemDto] })
  items: PublicMenuItemDto[];
}
