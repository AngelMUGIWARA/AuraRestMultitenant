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
        payment: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return { orders, startDate, endDate };
  }
}
