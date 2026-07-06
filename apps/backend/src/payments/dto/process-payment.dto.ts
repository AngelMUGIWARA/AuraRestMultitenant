import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDecimal,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

enum PaymentMethodDto {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  QR = 'QR',
  OTHER = 'OTHER',
}

class SplitPaymentDto {
  @ApiProperty({ enum: PaymentMethodDto })
  @IsEnum(PaymentMethodDto)
  method: PaymentMethodDto;

  @ApiProperty({ example: '150.00' })
  @IsString()
  amount: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;
}

class TipDto {
  @ApiProperty({ example: '30.00' })
  @IsString()
  amount: string;

  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED'], default: 'FIXED' })
  @IsEnum(['PERCENTAGE', 'FIXED'])
  method: 'PERCENTAGE' | 'FIXED';
}

export class ProcessPaymentDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  orderId: string;

  @ApiProperty({ type: [SplitPaymentDto], description: 'One or more payment splits' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SplitPaymentDto)
  payments: SplitPaymentDto[];

  @ApiPropertyOptional({ type: TipDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TipDto)
  tip?: TipDto;

  @ApiPropertyOptional({ description: 'Idempotency key to prevent duplicate charges' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
