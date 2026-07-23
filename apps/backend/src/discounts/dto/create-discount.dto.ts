import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsISO8601, IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export enum DiscountTypeDto {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export class CreateDiscountDto {
  @ApiProperty({ example: 'Descuento 10%' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Descuento general para clientes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'SUMMER10' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ enum: DiscountTypeDto, example: DiscountTypeDto.PERCENTAGE })
  @IsEnum(DiscountTypeDto)
  type: DiscountTypeDto;

  @ApiProperty({ description: 'Value: percentage (10 = 10%) or fixed amount', example: '10' })
  @IsNumberString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @ApiPropertyOptional({ example: '100.00' })
  @IsOptional()
  @IsNumberString()
  maxAmount?: string;

  @ApiPropertyOptional({ example: '200.00' })
  @IsOptional()
  @IsNumberString()
  minPurchase?: string;
}

export class DiscountResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiPropertyOptional() code?: string | null;
  @ApiProperty() type: string;
  @ApiProperty() value: number;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() branchId?: string | null;
  @ApiPropertyOptional() startsAt?: string | null;
  @ApiPropertyOptional() endsAt?: string | null;
  @ApiPropertyOptional() maxAmount?: number | null;
  @ApiPropertyOptional() minPurchase?: number | null;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}
