import { ApiProperty } from '@nestjs/swagger';

export class PeakHourDto {
  @ApiProperty({ description: 'Hora del día (0-23)', example: 13 })
  hour: number;

  @ApiProperty({ description: 'Etiqueta legible', example: '1:00 PM' })
  label: string;

  @ApiProperty({ description: 'Número de órdenes en esa hora', example: 18 })
  orders: number;

  @ApiProperty({ description: 'Ingresos totales en esa hora', example: 4200.0 })
  revenue: number;
}

export class PeakHoursReportResponseDto {
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

  @ApiProperty({ description: 'Total de órdenes en el período', example: 120 })
  totalOrders: number;

  @ApiProperty({
    type: [PeakHourDto],
    description:
      'Órdenes agrupadas por hora, ordenadas de mayor a menor actividad',
  })
  byHour: PeakHourDto[];
}
