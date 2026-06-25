import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { SalesReportQueryDto } from './dto/sales-report-query.dto';

@Injectable()
export class ReportsRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string) {
    return this.tenantPrisma.getClient(schemaName);
  }

  async getSalesReport(schemaName: string, query: SalesReportQueryDto) {
    const db = this.db(schemaName);

    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(new Date().getFullYear(), 0, 1); // 1 enero del año actual

    const endDate = query.endDate ? new Date(query.endDate) : new Date(); // hoy

    // Trae todas las órdenes PAID en el período, con su pago
    const orders = await db.order.findMany({
      where: {
        status: 'PAID',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return { orders, startDate, endDate };
  }

  async getProductsReport(schemaName: string, query: SalesReportQueryDto) {
    const db = this.db(schemaName);

    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(new Date().getFullYear(), 0, 1);

    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    //Agrupa OrderItem por menuItemId sumando cantidades y subtotales,
    //pero solo de órdenes que estén en estado PAID
    const grouped = await db.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: {
          status: 'PAID',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
    });

    //Trae los detalles de cada MenuItem (nombre y categoría)
    const menuItemsIds = grouped.map((g) => g.menuItemId);
    const menuItems = await db.menuItem.findMany({
      where: { id: { in: menuItemsIds } },
      include: { category: true },
    });

    return { grouped, menuItems, startDate, endDate };
  }

  async getPaymentsReport(schemaName: string, query: SalesReportQueryDto) {
    const db = this.db(schemaName);

    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(new Date().getFullYear(), 0, 1);

    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const grouped = await db.payment.groupBy({
      by: ['method'],
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    return { grouped, startDate, endDate };
  }

  async getPeakHoursReport(schemaName: string, query: SalesReportQueryDto) {
    const db = this.db(schemaName);

    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(new Date().getFullYear(), 0, 1);

    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const orders = await db.order.findMany({
      where: {
        status: 'PAID',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        total: true,
      },
    });

    return { orders, startDate, endDate };
  }
}
