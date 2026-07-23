import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

enum DiscountTypeDto {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export class CreateDiscountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ enum: DiscountTypeDto })
  @IsEnum(DiscountTypeDto)
  type: DiscountTypeDto;

  @ApiProperty({ description: 'Value: percentage (10 = 10%) or fixed amount' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maxAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  minPurchase?: string;
}

export class DiscountResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() code?: string | null;
  @ApiProperty() type: string;
  @ApiProperty() value: number;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() maxAmount?: number | null;
  @ApiPropertyOptional() minPurchase?: number | null;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}
