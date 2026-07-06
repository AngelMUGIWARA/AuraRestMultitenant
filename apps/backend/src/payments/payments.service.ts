import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { $Enums } from '../generated/prisma-tenant';
import type { Prisma } from '../generated/prisma-tenant';
import { EventBusService } from '../event-bus/event-bus.service';
import { PaymentsRepository } from './payments.repository';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import {
  mapPaymentMethodFromDb,
  mapPaymentStatusFromDb,
} from '../common/utils/order-mapper';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepo: PaymentsRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async processPayment(schemaName: string, dto: ProcessPaymentDto) {
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
        async (tx: Prisma.TransactionClient) => {
          const order = await this.paymentsRepo.findOrderById(
            schemaName,
            dto.orderId,
            tx,
          );

          if (!order) {
            throw new BadRequestException('La orden no existe.');
          }

          const existingPayments = await this.paymentsRepo.findByOrder(
            schemaName,
            dto.orderId,
            tx,
          );

          const completedPayments = existingPayments.filter(
            (payment) => payment.status === $Enums.PaymentStatus.COMPLETED,
          );

          const alreadyPaid = completedPayments.reduce((sum, payment) => {
            return sum + Number(payment.amount);
          }, 0);

          const orderTotal = Number(order.total);
          const pendingAmount = Number((orderTotal - alreadyPaid).toFixed(2));

          if (pendingAmount <= 0) {
            throw new BadRequestException('La orden ya fue pagada.');
          }

          const incomingAmount = dto.payments.reduce((sum, payment) => {
            const amount = Number(payment.amount);

            if (Number.isNaN(amount) || amount <= 0) {
              throw new BadRequestException(
                'El monto de cada pago debe ser mayor a cero.',
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

          if (normalizedIncomingAmount < pendingAmount) {
            throw new BadRequestException(
              `El pago no cubre el total pendiente. Pendiente: ${pendingAmount.toFixed(2)}`,
            );
          }

          const paymentRecords: any[] = [];

          for (const split of dto.payments) {
            const payment = await this.paymentsRepo.createPayment(
              schemaName,
              {
                amount: split.amount,
                method: split.method as $Enums.PaymentMethod,
                status: $Enums.PaymentStatus.COMPLETED,
                reference: split.reference,
                ...(idempotencyKey ? { idempotencyKey } : {}),
                processedAt: new Date(),
                order: { connect: { id: dto.orderId } },
              },
              tx,
            );

            paymentRecords.push(payment);
          }

          if (dto.tip) {
            const lastPayment = paymentRecords[paymentRecords.length - 1];

            await this.paymentsRepo.createTip(
              schemaName,
              {
                amount: dto.tip.amount,
                method:
                  dto.tip.method === 'PERCENTAGE'
                    ? $Enums.TipMethod.PERCENTAGE
                    : $Enums.TipMethod.FIXED,
                payment: { connect: { id: lastPayment.id } },
              },
              tx,
            );
          }

          await this.paymentsRepo.updateOrderStatus(
            schemaName,
            dto.orderId,
            'PAID',
            tx,
          );

          if (order.table) {
            await this.paymentsRepo.updateTableStatus(
              schemaName,
              order.table.id,
              'AVAILABLE',
              tx,
            );
          }

          this.eventBus.emit('payment:completed', {
            orderId: dto.orderId,
            amount: normalizedIncomingAmount,
            methods: dto.payments.map((p) => p.method),
          });

          return paymentRecords.map((p: any) => ({
            id: p.id,
            orderId: p.orderId,
            amount: Number(p.amount),
            method: mapPaymentMethodFromDb(p.method),
            status: mapPaymentStatusFromDb(p.status),
            reference: p.reference || null,
            tipAmount: dto.tip ? parseFloat(dto.tip.amount) : null,
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
      tipAmount: p.tip ? Number(p.tip.amount) : null,
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
        tipAmount: payment.tip ? Number(payment.tip.amount) : null,
        createdAt: payment.createdAt?.toISOString(),
      },
    ];
  }
}