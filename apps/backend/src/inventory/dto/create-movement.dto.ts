import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from "class-validator";

export const MOVEMENT_TYPES = [
  "PURCHASE",
  "CONSUMPTION",
  "ADJUSTMENT",
  "WASTE",
  "TRANSFER_IN",
  "TRANSFER_OUT",
] as const;

export type MovementTypeDto = (typeof MOVEMENT_TYPES)[number];

export class CreateMovementDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ enum: MOVEMENT_TYPES })
  @IsIn(MOVEMENT_TYPES)
  type: MovementTypeDto;

  @ApiProperty({ description: "Cantidad siempre positiva; el signo lo da el tipo" })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({
    enum: ["IN", "OUT"],
    description: "Solo para ADJUSTMENT: dirección del ajuste (default IN)",
  })
  @IsOptional()
  @IsIn(["IN", "OUT"])
  direction?: "IN" | "OUT";

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: "Folio de orden, factura, etc." })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: "Solo aplica a PURCHASE" })
  @IsOptional()
  @IsString()
  supplierId?: string;
}
