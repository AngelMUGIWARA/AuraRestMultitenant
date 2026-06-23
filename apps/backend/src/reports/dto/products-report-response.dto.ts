import { ApiProperty } from '@nestjs/swagger';

export class TopProductDto {
  @ApiProperty({ description: 'ID del platillo', example: 'cmqj...' })
  menuItemId: string;

  @ApiProperty({
    description: 'Nombre del platillo',
    example: 'Arrachera a las Brasas',
  })
  name: string;

  @ApiProperty({
    description: 'Categoría del platillo',
    example: 'Platos Fuertes',
  })
  category: string;

  @ApiProperty({ description: 'Total de unidades vendidas', example: 42 })
  totalQuantity: number;

  @ApiProperty({
    description: 'Total recaudado por este platillo',
    example: 11970.0,
  })
  totalRevenue: number;
}

export class ProductsReportResponseDto {
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
    type: [TopProductDto],
    description: 'Productos ordenados de mayor a menor ventas',
  })
  topProducts: TopProductDto[];
}
