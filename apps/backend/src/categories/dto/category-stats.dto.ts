import { ApiProperty } from '@nestjs/swagger';

export class CategoryStatsDto {
  @ApiProperty()
  totalCategories: number;

  @ApiProperty()
  activeCategories: number;

  @ApiProperty()
  inactiveCategories: number;
}