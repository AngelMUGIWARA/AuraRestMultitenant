import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { SalesReportQueryDto } from './dto/sales-report-query.dto';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Entrada normalizada para agregación por hora: una fila = una "ocurrencia"
// (una orden completa, o una línea de un platillo específico) con su cantidad
// e importe, para que getPeakHoursReport agregue igual en ambos casos.
interface HourBucketEntry {
  createdAt: Date;
  quantity: number;
  amount: number;
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private db(schemaName: string) {
    return this.tenantPrisma.getClient(schemaName);
  }

  // Rango de fechas explícito (startDate/endDate) con el default histórico
  // (1 enero del año actual -> hoy). endDate se ancla al final del día
  // (23:59:59.999Z) para no excluir ventas hechas tarde ese día.
  private resolveDateRange(query: {
    startDate?: string;
    endDate?: string;
  }): DateRange {
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(new Date().getFullYear(), 0, 1);

    const endDate = query.endDate
      ? new Date(`${query.endDate}T23:59:59.999Z`)
      : new Date();

    return { startDate, endDate };
  }

  // Mapea un período estándar a un rango de fechas en días calendario UTC.
  // - daily: hoy completo.
  // - weekly: ventana móvil de los últimos 7 días (hoy incluido), no semana
  //   calendario, para no depender de un día de inicio de semana.
  // - monthly: del día 1 del mes actual a hoy (no hasta fin de mes).
  // - yearly: del 1 de enero del año actual a hoy (igual al default histórico).
  // Un valor no reconocido regresa null para que el caller conserve el
  // comportamiento anterior (startDate/endDate explícitos o el default).
  private resolvePeriodRange(period: string): DateRange | null {
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    const endDate = new Date(`${todayIso}T23:59:59.999Z`);

    switch (period) {
      case 'daily':
        return { startDate: new Date(`${todayIso}T00:00:00.000Z`), endDate };

      case 'weekly': {
        const start = new Date(now);
        start.setUTCDate(start.getUTCDate() - 6);
        const startIso = start.toISOString().slice(0, 10);
        return { startDate: new Date(`${startIso}T00:00:00.000Z`), endDate };
      }

      case 'monthly': {
        const startIso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
        return { startDate: new Date(`${startIso}T00:00:00.000Z`), endDate };
      }

      case 'yearly': {
        const startIso = `${now.getUTCFullYear()}-01-01`;
        return { startDate: new Date(`${startIso}T00:00:00.000Z`), endDate };
      }

      default:
        return null;
    }
  }

  async getSalesReport(schemaName: string, query: SalesReportQueryDto) {
    const db = this.db(schemaName);

    const { startDate, endDate } =
      (query.period && this.resolvePeriodRange(query.period)) ||
      this.resolveDateRange(query);

    // Trae todas las órdenes con pago completo en el período, con su pago.
    // Filtra por `paymentStatus` (lo que sí actualiza processPayment), no
    // por `status` (máquina de estados de cocina/entrega, distinta).
    const orders = await db.order.findMany({
      where: {
        paymentStatus: 'PAID',
        status: { not: 'CANCELLED' },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(query.branchId && { branchId: query.branchId }),
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

    const { startDate, endDate } = this.resolveDateRange(query);

    //Agrupa OrderItem por menuItemId sumando cantidades y subtotales,
    //pero solo de órdenes con pago completo (paymentStatus, no status)
    const grouped = await db.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: {
          paymentStatus: 'PAID',
          status: { not: 'CANCELLED' },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          ...(query.branchId && { branchId: query.branchId }),
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

    const { startDate, endDate } = this.resolveDateRange(query);

    const grouped = await db.payment.groupBy({
      by: ['method'],
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(query.branchId && { order: { branchId: query.branchId } }),
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

    const { startDate, endDate } = this.resolveDateRange(query);

    if (query.menuItem) {
      // Horario pico de un platillo específico: cuenta unidades vendidas de
      // ESE platillo por hora, no órdenes completas que lo incluyan.
      const orderItems = await db.orderItem.findMany({
        where: {
          order: {
            paymentStatus: 'PAID',
            status: { not: 'CANCELLED' },
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
            ...(query.branchId && { branchId: query.branchId }),
          },
          menuItem: {
            name: { contains: query.menuItem, mode: 'insensitive' },
          },
        },
        select: {
          quantity: true,
          subtotal: true,
          order: { select: { createdAt: true } },
        },
      });

      const entries: HourBucketEntry[] = orderItems.map((item) => ({
        createdAt: item.order.createdAt,
        quantity: item.quantity,
        amount: Number(item.subtotal),
      }));

      return { entries, startDate, endDate };
    }

    // Horario pico general: cada orden pagada cuenta como 1 ocurrencia,
    // con su total como importe (comportamiento histórico sin cambios,
    // salvo el filtro corregido a paymentStatus).
    const orders = await db.order.findMany({
      where: {
        paymentStatus: 'PAID',
        status: { not: 'CANCELLED' },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(query.branchId && { branchId: query.branchId }),
      },
      select: {
        createdAt: true,
        total: true,
      },
    });

    const entries: HourBucketEntry[] = orders.map((order) => ({
      createdAt: order.createdAt,
      quantity: 1,
      amount: Number(order.total),
    }));

    return { entries, startDate, endDate };
  }
}
