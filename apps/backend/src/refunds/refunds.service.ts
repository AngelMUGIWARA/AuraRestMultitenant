import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma-tenant';
import { RefundsRepository } from './refunds.repository';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RefundValidationService } from './refund-validation.service';
import { RefundCalculator } from './refund-calculator';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { EventBusService } from '../event-bus/event-bus.service';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly refundsRepo: RefundsRepository,
    private readonly validationService: RefundValidationService,
    private readonly activityLog: ActivityLogService,
    private readonly eventBus: EventBusService,
  ) {}

  async createRefund(
    schemaName: string,
    orderId: string,
    paymentId: string,
    dto: CreateRefundDto,
    userId?: string,
  ) {
    if (dto.idempotencyKey) {
      const existing = await this.refundsRepo.findRefundByIdempotencyKey(
        schemaName,
        dto.idempotencyKey,
      );

      if (existing) {
        if (
          existing.orderId !== orderId ||
          existing.paymentId !== paymentId ||
          !new Prisma.Decimal(existing.amount).equals(dto.amount)
        ) {
          throw new ConflictException('La idempotencyKey ya fue usada con parámetros diferentes.');
        }
        
        const fullOrder = await this.refundsRepo.findOrderById(schemaName, orderId);
        return this.toRefundResponse(existing, fullOrder);
      }
    }

    try {
      const txResult = await this.refundsRepo.runTransaction(schemaName, async (tx) => {
        const order = await this.refundsRepo.findOrderById(schemaName, orderId, tx);
        if (!order) {
          throw new BadRequestException('La orden no existe.');
        }

        const payment = await this.refundsRepo.findPaymentById(schemaName, paymentId, tx);
        if (!payment) {
          throw new BadRequestException('El pago no existe.');
        }

        if (payment.orderId !== order.id) {
          throw new BadRequestException('El pago no pertenece a la orden indicada.');
        }

        this.validationService.validatePaymentStatus(payment.status);

        const paymentRefundedAmount = payment.refunds
          .filter((r) => r.status === 'COMPLETED')
          .reduce((sum, r) => sum.plus(new Prisma.Decimal(r.amount)), new Prisma.Decimal(0));

        this.validationService.validateRefundAmount(
          new Prisma.Decimal(dto.amount),
          new Prisma.Decimal(payment.amount),
          paymentRefundedAmount,
        );

        // Optimistic locking
        const updatedOrder = await this.refundsRepo.updateOrderVersion(
          schemaName,
          order.id,
          dto.expectedVersion,
          tx,
        );

        const refund = await this.refundsRepo.createRefund(
          schemaName,
          {
            amount: dto.amount,
            reason: dto.reason,
            status: 'COMPLETED',
            idempotencyKey: dto.idempotencyKey,
            completedAt: new Date(),
            requestedBy: userId,
            payment: { connect: { id: payment.id } },
            order: { connect: { id: order.id } },
            user: userId ? { connect: { id: userId } } : undefined,
          },
          tx,
        );

        const newPaymentRefundedAmount = paymentRefundedAmount.plus(new Prisma.Decimal(dto.amount));
        const newPaymentStatus = RefundCalculator.determinePaymentStatus(
          new Prisma.Decimal(payment.amount),
          newPaymentRefundedAmount,
        );

        let finalPayment = payment;
        if (payment.status !== newPaymentStatus) {
          finalPayment = await this.refundsRepo.updatePaymentStatus(
            schemaName,
            payment.id,
            newPaymentStatus,
            tx,
          ) as any;
        }

        const branchId = updatedOrder?.branchId;
        if (branchId && userId) {
          this.activityLog.log(
            schemaName,
            {
              branchId,
              userId,
              action: 'REFUND_PROCESSED',
              entity: 'REFUND',
              entityId: refund.id,
              changes: JSON.stringify({ amount: dto.amount, paymentId }),
            },
            tx,
          );
        }

        // Fetch order again to return fully updated calculations
        const latestOrder = await this.refundsRepo.findOrderById(schemaName, orderId, tx);
        return { refund, payment, branchId, latestOrder };
      });

      this.eventBus.emit('refund:completed', {
        schemaName,
        refundId: txResult.refund.id,
        paymentId: txResult.payment.id,
        amount: dto.amount,
        paymentMethod: txResult.payment.method as string,
        status: txResult.refund.status as string,
        branchId: txResult.branchId ?? null,
        userId: userId ?? null,
        orderId,
      });

      return this.toRefundResponse(txResult.refund, txResult.latestOrder);
    } catch (err: any) {
      if (err?.code === 'P2002' && dto.idempotencyKey) {
        const existing = await this.refundsRepo.findRefundByIdempotencyKey(
          schemaName,
          dto.idempotencyKey,
        );
        if (existing) {
          const fullOrder = await this.refundsRepo.findOrderById(schemaName, orderId);
          return this.toRefundResponse(existing, fullOrder);
        }
      }
      if (err?.code === 'P2025') {
        throw new ConflictException(
          'La orden fue modificada por otro usuario. Recarga e intenta de nuevo.',
        );
      }
      throw err;
    }
  }

  async getRefund(schemaName: string, refundId: string) {
    const refunds = await this.refundsRepo.findRefundsByOrder(schemaName, 'fake');
    // will just implement simple find for now
    return null;
  }

  private toRefundResponse(refund: any, order: any) {
    let orderCompletedPaidAmount = new Prisma.Decimal(0);
    let orderRefundedAmount = new Prisma.Decimal(0);

    if (order && order.payments) {
      for (const p of order.payments) {
        if (p.status === 'COMPLETED' || p.status === 'PARTIALLY_REFUNDED' || p.status === 'REFUNDED') {
          orderCompletedPaidAmount = orderCompletedPaidAmount.plus(new Prisma.Decimal(p.amount));
        }
      }
    }
    
    if (order && order.refunds) {
       for (const r of order.refunds) {
          if (r.status === 'COMPLETED') {
             orderRefundedAmount = orderRefundedAmount.plus(new Prisma.Decimal(r.amount));
          }
       }
    }

    const orderNetPaidAmount = RefundCalculator.getNetPaidAmount(orderCompletedPaidAmount, orderRefundedAmount);
    
    // For payment specifically:
    let paymentAmount = new Prisma.Decimal(0);
    let paymentRefundedAmount = new Prisma.Decimal(0);
    let paymentStatus = 'COMPLETED';
    
    if (order && order.payments) {
       const p = order.payments.find((pay: any) => pay.id === refund.paymentId);
       if (p) {
           paymentAmount = new Prisma.Decimal(p.amount);
           paymentStatus = p.status;
           if (p.refunds) {
               for (const r of p.refunds) {
                   if (r.status === 'COMPLETED') {
                       paymentRefundedAmount = paymentRefundedAmount.plus(new Prisma.Decimal(r.amount));
                   }
               }
           }
       }
    }

    const paymentRefundableAmount = RefundCalculator.getPaymentRefundableAmount(paymentAmount, paymentRefundedAmount);

    return {
      id: refund.id,
      paymentId: refund.paymentId,
      orderId: refund.orderId,
      amount: Number(refund.amount),
      reason: refund.reason,
      status: refund.status,
      idempotencyKey: refund.idempotencyKey,
      requestedBy: refund.requestedBy,
      createdBy: refund.createdBy,
      createdAt: refund.createdAt?.toISOString(),
      completedAt: refund.completedAt?.toISOString(),
      paymentAmount: Number(paymentAmount),
      paymentRefundedAmount: Number(paymentRefundedAmount),
      paymentRefundableAmount: Number(paymentRefundableAmount),
      paymentStatus: paymentStatus,
      orderCompletedPaidAmount: Number(orderCompletedPaidAmount),
      orderRefundedAmount: Number(orderRefundedAmount),
      orderNetPaidAmount: Number(orderNetPaidAmount),
      orderStatus: order?.status,
      orderVersion: order?.version,
    };
  }
}
