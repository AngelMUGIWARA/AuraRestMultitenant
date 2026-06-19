import { ApiProperty } from '@nestjs/swagger';

export class SalesSummaryDto {
    @ApiProperty({ description: 'Total de órdenes en el período', example: 42})
    totalOrders: number;

    @ApiProperty({ description: 'Suma de subtotales sin impuesto', example: 12500.00 })
    totalSubtotal: number;

    @ApiProperty({ description: 'Suma de impuestos', example: 2000.00 })
    totalTax: number;

    @ApiProperty({ description: 'Suma total con impuesto', example: 14500.00 })
    totalRevenue: number;

    @ApiProperty({ description: 'Promedio por orden', example: 345.23 })
    averageOrderValue: number;
}

export class DailySalesDto {
    @ApiProperty({ description: 'Fecha (YYYY-MM-DD)', example: '2025-06-01' })
    date: string;
    
    @ApiProperty({ example: 8 })
    orders: number;

    @ApiProperty({ example: 3200.00 })
    revenue: number;
}

export class SalesReportResponseDto {
    @ApiProperty({ description: 'Período consultado - inicio', example: '2025-01-01' })
    startDate: string;

    @ApiProperty({ description: 'Período consultado - fin', example: '2025-12-31' })
    endDate: string;

    @ApiProperty({ type: SalesSummaryDto })
    summary: SalesSummaryDto;

    @ApiProperty({ type: [DailySalesDto], description: 'Ventas agrupadas por día' })
    dailySales: DailySalesDto[];
}