import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

enum PromotionTypeDto {
  PERCENTAGE_DISCOUNT = 'PERCENTAGE_DISCOUNT',
  FIXED_DISCOUNT = 'FIXED_DISCOUNT',
  BUY_X_GET_Y = 'BUY_X_GET_Y',
  FREE_ITEM = 'FREE_ITEM',
}

export class CreatePromotionDto {
  @ApiProperty()
  @IsString()
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
  value: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  minPurchase?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endsAt?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PromotionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiProperty() type: string;
  @ApiProperty() value: number;
  @ApiPropertyOptional() minPurchase?: number | null;
  @ApiPropertyOptional() startsAt?: string | null;
  @ApiPropertyOptional() endsAt?: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}
