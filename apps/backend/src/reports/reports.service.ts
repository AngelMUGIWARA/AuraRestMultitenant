import { Injectable } from '@nestjs/common';
import { ReportsRepository } from './reports.repository';
import { SalesReportQueryDto } from './dto/sales-report-query.dto';
import {
  SalesReportResponseDto,
  SalesSummaryDto,
  DailySalesDto,
} from './dto/sales-report-response.dto';
import {
  ProductsReportResponseDto,
  TopProductDto,
} from './dto/products-report-response.dto';
import {
  PaymentsReportResponseDto,
  PaymentByMethodDto,
} from './dto/payments-report-response.dto';
import {
  PeakHoursReportResponseDto,
  PeakHourDto,
} from './dto/peak-hours-report-response.dto';

function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  return hour < 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`;
}

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

  async getProductsReport(
    schemaName: string,
    query: SalesReportQueryDto,
  ): Promise<ProductsReportResponseDto> {
    const { grouped, menuItems, startDate, endDate } =
      await this.repo.getProductsReport(schemaName, query);

    interface MenuItemWithCategory {
      id: string;
      name: string;
      category: { name: string };
    }

    const menuItemMap = new Map<string, MenuItemWithCategory>(
      menuItems.map((item) => [item.id, item as MenuItemWithCategory]),
    );

    const topProducts: TopProductDto[] = grouped
      .map((g) => {
        const menuItem = menuItemMap.get(g.menuItemId);
        if (!menuItem) return null;

        return {
          menuItemId: g.menuItemId,
          name: menuItem.name,
          category: menuItem.category.name,
          totalQuantity: g._sum.quantity ?? 0,
          totalRevenue: +Number(g._sum.subtotal ?? 0).toFixed(2),
        };
      })
      .filter((item): item is TopProductDto => item !== null);

    return {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      topProducts,
    };
  }

  async getPaymentsReport(
    schemaName: string,
    query: SalesReportQueryDto,
  ): Promise<PaymentsReportResponseDto> {
    const { grouped, startDate, endDate } = await this.repo.getPaymentsReport(
      schemaName,
      query,
    );

    const totalPayments = grouped.reduce(
      (sum: number, g) => sum + (g._count.id ?? 0),
      0,
    );

    const totalRevenue = grouped.reduce(
      (sum: number, g) => sum + Number(g._sum.amount ?? 0),
      0,
    );

    const byMethod: PaymentByMethodDto[] = grouped.map((g) => ({
      method: g.method,
      count: g._count.id ?? 0,
      amount: +Number(g._sum.amount ?? 0).toFixed(2),
      percentage:
        totalRevenue > 0
          ? +((Number(g._sum.amount ?? 0) / totalRevenue) * 100).toFixed(2)
          : 0,
    }));

    return {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      totalPayments,
      totalRevenue: +totalRevenue.toFixed(2),
      byMethod,
    };
  }

  async getPeakHoursReport(
    schemaName: string,
    query: SalesReportQueryDto,
  ): Promise<PeakHoursReportResponseDto> {
    const { orders, startDate, endDate } = await this.repo.getPeakHoursReport(
      schemaName,
      query,
    );

    const hourMap = new Map<number, { orders: number; revenue: number }>();

    for (const order of orders) {
      const hour = order.createdAt.getHours();
      const existing = hourMap.get(hour) ?? { orders: 0, revenue: 0 };
      hourMap.set(hour, {
        orders: existing.orders + 1,
        revenue: existing.revenue + Number(order.total),
      });
    }

    const byHour: PeakHourDto[] = Array.from(hourMap.entries())
      .map(([hour, data]) => ({
        hour,
        label: formatHour(hour),
        orders: data.orders,
        revenue: +data.revenue.toFixed(2),
      }))
      .sort((a, b) => b.orders - a.orders);

    return {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      totalOrders: orders.length,
      byHour,
    };
  }
}
