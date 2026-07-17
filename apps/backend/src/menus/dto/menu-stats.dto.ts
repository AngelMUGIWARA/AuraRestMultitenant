import { ApiProperty } from "@nestjs/swagger";

export class MenuStatsDto {
  @ApiProperty()
  totalItems: number;

  @ApiProperty()
  availableItems: number;

  @ApiProperty()
  unavailableItems: number;

  @ApiProperty()
  outOfStockItems: number;

  @ApiProperty()
  totalCategories: number;

  @ApiProperty()
  avgPrice: number;

  @ApiProperty()
  popularItems: number;
}
