import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

export enum MenuItemStatus {
  AVAILABLE = "AVAILABLE",
  UNAVAILABLE = "UNAVAILABLE",
  OUT_OF_STOCK = "OUT_OF_STOCK",
}

export class UpdateStatusDto {
  @ApiProperty({ enum: MenuItemStatus })
  @IsEnum(MenuItemStatus)
  status: MenuItemStatus;
}
