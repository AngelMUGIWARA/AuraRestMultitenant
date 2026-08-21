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

  @ApiPropertyOptional({
    description: 'Cash physically received from the customer; only valid for CASH. Must be >= amount. The excess is returned as change and is never applied to the order.',
    example: '100.00',
  })
  @IsOptional()
  @IsString()
  receivedAmount?: string;
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

  @ApiPropertyOptional({ description: 'Idempotency key to prevent duplicate charges' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
