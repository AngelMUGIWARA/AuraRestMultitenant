import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReceiptResponseDto {
  @ApiProperty({ description: 'ID único del comprobante', example: 'clx1234567890abcdef' })
  id!: string;

  @ApiProperty({ description: 'ID de la orden asociada', example: 'clx1234567890abcdef' })
  orderId!: string;

  @ApiProperty({ description: 'Folio consecutivo del comprobante', example: 'TKT-000001' })
  folio!: string;

  @ApiPropertyOptional({ description: 'ID de la sucursal' })
  branchId?: string | null;

  @ApiPropertyOptional({ description: 'ID del usuario que emitió el comprobante' })
  userId?: string | null;

  @ApiProperty({ description: 'Subtotal antes de promociones', example: '200.00' })
  subtotal!: string;

  @ApiProperty({ description: 'Monto total de promociones aplicadas', example: '20.00' })
  promotionAmount!: string;

  @ApiProperty({ description: 'Monto total de descuentos manuales', example: '10.00' })
  discountAmount!: string;

  @ApiProperty({ description: 'Monto de impuestos', example: '27.20' })
  taxAmount!: string;

  @ApiProperty({ description: 'Monto de propina', example: '30.00' })
  tipAmount!: string;

  @ApiProperty({ description: 'Total del comprobante', example: '227.20' })
  total!: string;

  @ApiProperty({ description: 'Snapshot inmutable del comprobante al momento de emisión' })
  snapshot!: Record<string, unknown>;

  @ApiProperty({ description: 'Fecha y hora de emisión (ISO 8601)', example: '2026-07-23T22:00:00.000Z' })
  issuedAt!: string;

  @ApiProperty({ description: 'Fecha de creación (ISO 8601)' })
  createdAt!: string;

  @ApiProperty({ description: 'Fecha de última actualización (ISO 8601)' })
  updatedAt!: string;
}

export class PaginatedReceiptsDto {
  @ApiProperty({ type: [ReceiptResponseDto] })
  data!: ReceiptResponseDto[];

  @ApiProperty({ description: 'Total de registros', example: 42 })
  total!: number;

  @ApiProperty({ description: 'Página actual', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Elementos por página', example: 20 })
  limit!: number;

  @ApiProperty({ description: 'Total de páginas', example: 3 })
  totalPages!: number;
}
