import { ApiProperty } from "@nestjs/swagger";

export class MenuStatsDto {
  @ApiProperty()
  totalProducts: number;

  @ApiProperty()
  availableProducts: number;

  @ApiProperty()
  unavailableProducts: number;

  @ApiProperty()
  outOfStockProducts: number;

  @ApiProperty()
  categories: number;
}
