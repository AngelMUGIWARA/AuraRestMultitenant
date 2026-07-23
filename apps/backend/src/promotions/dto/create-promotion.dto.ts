import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export enum PromotionTypeDto {
  PERCENTAGE_DISCOUNT = 'PERCENTAGE_DISCOUNT',
  FIXED_DISCOUNT = 'FIXED_DISCOUNT',
  BUY_X_GET_Y = 'BUY_X_GET_Y',
  FREE_ITEM = 'FREE_ITEM',
  SPECIAL_PRICE = 'SPECIAL_PRICE',
  CATEGORY_PERCENTAGE = 'CATEGORY_PERCENTAGE',
  CATEGORY_FIXED = 'CATEGORY_FIXED',
}

export class CreatePromotionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PromotionTypeDto })
  @IsEnum(PromotionTypeDto)
  type: PromotionTypeDto;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  minPurchase?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maxAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  buyQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  getQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  endMinute?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetItemIds?: string[];
}

export class PromotionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiProperty() type: string;
  @ApiProperty() value: number;
  @ApiPropertyOptional() minPurchase?: number | null;
  @ApiPropertyOptional() maxAmount?: number | null;
  @ApiPropertyOptional() specialPrice?: number | null;
  @ApiPropertyOptional() buyQuantity?: number | null;
  @ApiPropertyOptional() getQuantity?: number | null;
  @ApiPropertyOptional() startsAt?: string | null;
  @ApiPropertyOptional() endsAt?: string | null;
  @ApiPropertyOptional() startMinute?: number | null;
  @ApiPropertyOptional() endMinute?: number | null;
  @ApiProperty() priority: number;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() branchId?: string | null;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}
