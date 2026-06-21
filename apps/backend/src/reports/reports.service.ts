import { Injectable } from '@nestjs/common';
import { ReportsRepository } from './reports.repository';
import { SalesReportQueryDto } from './dto/sales-report-query.dto';
import {
  SalesReportResponseDto,
  SalesSummaryDto,
  DailySalesDto,
} from './dto/sales-report-response.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly repo: ReportsRepository) {}

  async getSalesReport(
    schemaName: string,
    query: SalesReportQueryDto,
  ): Promise<SalesReportResponseDto> {
    const { orders, startDate, endDate } = await this.repo.getSalesReport(
      schemaName,
      query,
    );

    // Resumen global
    const totalOrders = orders.length;
    const totalSubtotal = orders.reduce(
      (sum, o) => sum + Number(o.subtotal),
      0,
    );
    const totalTax = orders.reduce((sum, o) => sum + Number(o.tax), 0);
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const summary: SalesSummaryDto = {
      totalOrders,
      totalSubtotal: +totalSubtotal.toFixed(2),
      totalTax: +totalTax.toFixed(2),
      totalRevenue: +totalRevenue.toFixed(2),
      averageOrderValue: +averageOrderValue.toFixed(2),
    };

    // Ventas agrupadas por día
    const dailyMap = new Map<string, { orders: number; revenue: number }>();

    for (const order of orders) {
      const date = order.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      const existing = dailyMap.get(date) ?? { orders: 0, revenue: 0 };
      dailyMap.set(date, {
        orders: existing.orders + 1,
        revenue: existing.revenue + Number(order.total),
      });
    }

    const dailySales: DailySalesDto[] = Array.from(dailyMap.entries()).map(
      ([date, data]) => ({
        date,
        orders: data.orders,
        revenue: +data.revenue.toFixed(2),
      }),
    );

    return {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      summary,
      dailySales,
    };
  }
}
