import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateReceiptDto {
  @ApiProperty({
    description: 'ID de la orden para la cual se emite el comprobante',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({
    description: 'Clave de idempotencia única para evitar duplicados',
    example: 'receipt-key-20260723-001',
  })
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;
}
