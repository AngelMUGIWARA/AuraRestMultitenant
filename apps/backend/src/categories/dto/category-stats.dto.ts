import { ApiProperty } from '@nestjs/swagger';

export class CategoryStatsDto {
  @ApiProperty()
  totalCategories: number;

  @ApiProperty()
  activeCategories: number;

  @ApiProperty()
  inactiveCategories: number;

  @ApiProperty()
  rootCategories: number;

  @ApiProperty()
  subCategories: number;

  @ApiProperty()
  avgProductsPerCategory: number;

  @ApiProperty()
  mostPopularCategory: string;
}
