import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { $Enums, TableStatus } from '../generated/prisma-tenant';
import { EventBusService } from '../event-bus/event-bus.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { PaymentsRepository } from './payments.repository';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import {
  mapPaymentMethodFromDb,
  mapPaymentStatusFromDb,
} from '../common/utils/order-mapper';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paymentsRepo: PaymentsRepository,
    private readonly eventBus: EventBusService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async processPayment(schemaName: string, dto: ProcessPaymentDto, userId?: string) {
    const idempotencyKey = dto.idempotencyKey;

    if (idempotencyKey) {
      const existing = await this.paymentsRepo.findPaymentByIdempotencyKey(
        schemaName,
        idempotencyKey,
      );

      if (existing) {
        return this.toPaymentResponse(existing, dto);
      }
    }

    try {
      return await this.paymentsRepo.runTransaction(
        schemaName,
        async (tx) => {
          const order = await this.paymentsRepo.findOrderById(
            schemaName,
            dto.orderId,
            tx,
          );

          if (!order) {
            throw new BadRequestException('La orden no existe.');
          }

          if (order.status === $Enums.OrderStatus.CANCELLED) {
            throw new BadRequestException('No se puede pagar una orden cancelada.');
          }

          const completedPayments = order.payments.filter(
            (p) => p.status === $Enums.PaymentStatus.COMPLETED || p.status === 'PARTIALLY_REFUNDED' || p.status === 'REFUNDED',
          );

          const completedPaidAmount = completedPayments.reduce(
            (sum, p) => sum + Number(p.amount),
            0,
          );

          const alreadyPaid = completedPaidAmount;

          const orderTotal = order.amountDueForPayments ? Number(order.amountDueForPayments) : Number(order.total);
          const pendingAmount = Number((orderTotal - alreadyPaid).toFixed(2));

          if (pendingAmount <= 0) {
            const idempotent = idempotencyKey
              ? await this.paymentsRepo.findPaymentByIdempotencyKey(schemaName, idempotencyKey, tx)
              : null;
            if (idempotent) {
              return this.toPaymentResponse(idempotent, dto);
            }
            throw new BadRequestException('La orden ya fue pagada.');
          }

          const incomingAmount = dto.payments.reduce((sum, payment) => {
            const amount = Number(payment.amount);

            if (Number.isNaN(amount) || amount <= 0) {
              throw new BadRequestException(
                'El monto de cada pago debe ser mayor a cero.',
              );
            }

            if (!Number.isFinite(amount)) {
              throw new BadRequestException(
                'El monto del pago no es un número válido.',
              );
            }

            return sum + amount;
          }, 0);

          const normalizedIncomingAmount = Number(incomingAmount.toFixed(2));

          if (normalizedIncomingAmount > pendingAmount) {
            throw new BadRequestException(
              `El monto excede el saldo pendiente. Pendiente: ${pendingAmount.toFixed(2)}`,
            );
          }

          const paymentRecords: any[] = [];

          for (let i = 0; i < dto.payments.length; i++) {
            const split = dto.payments[i];
            const isFirstPayment = i === 0;

            const payment = await this.paymentsRepo.createPayment(
              schemaName,
              {
                amount: split.amount,
                method: split.method as $Enums.PaymentMethod,
                status: $Enums.PaymentStatus.COMPLETED,
                reference: split.reference,
                ...(isFirstPayment && idempotencyKey ? { idempotencyKey } : {}),
                processedAt: new Date(),
                order: { connect: { id: dto.orderId } },
              },
              tx,
            );

            paymentRecords.push(payment);
          }

          const newAlreadyPaid = Number((alreadyPaid + normalizedIncomingAmount).toFixed(2));
          const newRemaining = Number((orderTotal - newAlreadyPaid).toFixed(2));
          const isFullyPaid = newRemaining <= 0;
          const newPaymentStatus = isFullyPaid
            ? 'PAID'
            : 'PARTIALLY_PAID';

          await this.paymentsRepo.updateOrderPaymentStatus(
            schemaName,
            dto.orderId,
            newPaymentStatus as any,
            order.version,
            tx,
          );

          if (isFullyPaid && order.table) {
            await this.paymentsRepo.updateTableStatus(
              schemaName,
              order.table.id,
              TableStatus.AVAILABLE,
              tx,
            );
          }

          this.eventBus.emit('payment:completed', {
            orderId: dto.orderId,
            orderNumber: order.folio,
            methods: dto.payments.map((p) => mapPaymentMethodFromDb(p.method as any)),
            amount: normalizedIncomingAmount,
            paidAmount: newAlreadyPaid,
            remainingAmount: newRemaining,
            isFullyPaid,
          });

          const branchId = order.table?.branchId;
          if (branchId && userId) {
            this.activityLog.log(schemaName, {
              branchId,
              userId,
              action: 'PAYMENT_PROCESSED',
              entity: 'ORDER',
              entityId: dto.orderId,
              changes: JSON.stringify({
                amount: normalizedIncomingAmount,
                methods: dto.payments.map((p) => p.method),
                isFullyPaid,
                remainingAmount: newRemaining,
              }),
            }, tx);
          }

          return paymentRecords.map((p: any) => ({
            id: p.id,
            orderId: p.orderId,
            amount: Number(p.amount),
            method: mapPaymentMethodFromDb(p.method),
            status: mapPaymentStatusFromDb(p.status),
            reference: p.reference || null,
            createdAt: p.createdAt?.toISOString(),
          }));
        },
      );
    } catch (err: any) {
      if (err?.code === 'P2002' && idempotencyKey) {
        const existing = await this.paymentsRepo.findPaymentByIdempotencyKey(
          schemaName,
          idempotencyKey,
        );

        if (existing) {
          return this.toPaymentResponse(existing, dto);
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

  async findByOrder(schemaName: string, orderId: string) {
    const payments = await this.paymentsRepo.findByOrder(schemaName, orderId);

    return payments.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      amount: Number(p.amount),
      method: mapPaymentMethodFromDb(p.method),
      status: mapPaymentStatusFromDb(p.status),
      reference: p.reference || null,
      createdAt: p.createdAt?.toISOString(),
    }));
  }

  private toPaymentResponse(payment: any, _dto: ProcessPaymentDto) {
    return [
      {
        id: payment.id,
        orderId: payment.orderId,
        amount: Number(payment.amount),
        method: mapPaymentMethodFromDb(payment.method),
        status: mapPaymentStatusFromDb(payment.status),
        reference: payment.reference || null,
        createdAt: payment.createdAt?.toISOString(),
      },
    ];
  }
}
