import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { OrdersRepository } from '../orders/orders.repository';
import { TipCalculator } from './tip-calculator';
import { TipValidationService } from './tip-validation.service';
import { UpdateTipDto } from './dto/update-tip.dto';
import { Prisma } from '../generated/prisma-tenant';
import { ActivityLogService } from '../activity-log/activity-log.service';
import type { Prisma as PrismaType } from '../generated/prisma-tenant';

@Injectable()
export class OrderTipService {
  constructor(
    private readonly ordersRepo: OrdersRepository,
    private readonly tipCalculator: TipCalculator,
    private readonly tipValidation: TipValidationService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async applyTip(schemaName: string, orderId: string, dto: UpdateTipDto, userId: string) {
    return this.ordersRepo.runTransaction(schemaName, async (tx: PrismaType.TransactionClient) => {
      const order = await this.ordersRepo.findById(schemaName, orderId, tx);
      if (!order) {
        throw new NotFoundException('Orden no encontrada');
      }

      if (order.version !== dto.expectedVersion) {
        throw new ConflictException('La orden fue modificada por otro usuario. Recarga e intenta de nuevo.');
      }

      this.tipValidation.validateOrderStatus(order.status);
      this.tipValidation.validateTipMethodParams(dto.method, dto.percentage, dto.amount);

      const totalBeforeTip = order.totalBeforeTip ? new Prisma.Decimal(order.totalBeforeTip) : new Prisma.Decimal(order.total);
      
      const calcResult = this.tipCalculator.calculate({
        method: dto.method,
        totalBeforeTip,
        percentage: dto.percentage !== undefined ? new Prisma.Decimal(dto.percentage) : undefined,
        requestedAmount: dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
      });

      const completedPayments = (order.payments || []).filter((p) => p.status === 'COMPLETED');
      const paidAmount = completedPayments.reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));
      
      this.tipValidation.validateFinancialConsistency(calcResult.amountDueForPayments, paidAmount);

      const isFullyPaid = calcResult.amountDueForPayments.greaterThan(0) 
        ? paidAmount.greaterThanOrEqualTo(calcResult.amountDueForPayments)
        : true; // if amount due is 0, consider paid (though usually shouldn't happen unless 0 total)

      const paymentStatus = isFullyPaid ? 'PAID' : (paidAmount.greaterThan(0) ? 'PARTIALLY_PAID' : 'UNPAID');

      if (order.tip) {
        if (dto.method === 'NONE') {
          await tx.tip.delete({ where: { id: order.tip.id } });
        } else {
          await tx.tip.update({
            where: { id: order.tip.id },
            data: {
              method: dto.method,
              percentage: dto.percentage !== undefined ? dto.percentage : null,
              requestedAmount: dto.amount !== undefined ? dto.amount : null,
              tipAmount: calcResult.tipAmount,
              cashTipAmount: calcResult.cashTipAmount,
              chargeableTipAmount: calcResult.chargeableTipAmount,
              updatedAt: new Date(),
            },
          });
        }
      } else if (dto.method !== 'NONE') {
        await tx.tip.create({
          data: {
            orderId: order.id,
            method: dto.method,
            amount: calcResult.tipAmount, // Legacy column
            percentage: dto.percentage !== undefined ? dto.percentage : null,
            requestedAmount: dto.amount !== undefined ? dto.amount : null,
            tipAmount: calcResult.tipAmount,
            cashTipAmount: calcResult.cashTipAmount,
            chargeableTipAmount: calcResult.chargeableTipAmount,
            baseAmount: totalBeforeTip,
            createdBy: userId,
          },
        });
      }

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          tipAmount: calcResult.tipAmount,
          cashTipAmount: calcResult.cashTipAmount,
          chargeableTipAmount: calcResult.chargeableTipAmount,
          totalBeforeTip: totalBeforeTip,
          amountDueForPayments: calcResult.amountDueForPayments,
          total: calcResult.finalTotal, // finalTotal is stored in total
          version: { increment: 1 },
          paymentStatus: paymentStatus,
        },
        include: { tip: true, table: true },
      });

      const branchId = updatedOrder.table?.branchId || order.table?.branchId;
      if (branchId) {
        this.activityLog.log(schemaName, {
          branchId,
          userId,
          action: dto.method === 'NONE' ? 'TIP_REMOVED' : 'TIP_APPLIED',
          entity: 'ORDER',
          entityId: order.id,
          changes: JSON.stringify({ 
            method: dto.method,
            tipAmount: calcResult.tipAmount,
            finalTotal: calcResult.finalTotal,
          }),
        }, tx);
      }

      return updatedOrder;
    });
  }
}
