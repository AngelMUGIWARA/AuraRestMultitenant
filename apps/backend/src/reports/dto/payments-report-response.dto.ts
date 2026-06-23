import { ApiProperty } from '@nestjs/swagger';

export class PaymentByMethodDto {
  @ApiProperty({ description: 'Método de pago', example: 'CASH' })
  method: string;

  @ApiProperty({ description: 'Número de transacciones', example: 6 })
  count: number;

  @ApiProperty({ description: 'Monto total por  este método', example: 4200.0 })
  amount: number;

  @ApiProperty({
    description: 'Porcentaje del total de ingresos',
    example: 49.41,
  })
  percentage: number;
}

export class PaymentsReportResponseDto {
  @ApiProperty({
    description: 'Período consultado - inicio',
    example: '2026-01-01',
  })
  startDate: string;

  @ApiProperty({
    description: 'Período consultado - fin',
    example: '2026-12-31',
  })
  endDate: string;

  @ApiProperty({
    description: 'Total de pagos completados',
    example: 10,
  })
  totalPayments: number;

  @ApiProperty({
    description: 'Ingresos totales del período',
    example: 8500.0,
  })
  totalRevenue: number;

  @ApiProperty({
    type: [PaymentByMethodDto],
    description: 'Desglose por método de pago',
  })
  byMethod: PaymentByMethodDto[];
}
