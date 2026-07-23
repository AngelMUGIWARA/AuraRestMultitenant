import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, OrderStatus } from '../generated/prisma-tenant';

@Injectable()
export class TipValidationService {
  validateOrderStatus(status: string) {
    const restrictedStatuses: OrderStatus[] = [OrderStatus.PAID, OrderStatus.CANCELLED];
    if (restrictedStatuses.includes(status as OrderStatus)) {
      throw new BadRequestException(`No se puede modificar la propina en estado ${status}`);
    }
  }

  validateTipMethodParams(method: string, percentage?: number, amount?: number) {
    if (method === 'PERCENTAGE') {
      if (percentage === undefined || percentage === null || percentage < 0 || percentage > 100) {
        throw new BadRequestException('Porcentaje inválido');
      }
    } else if (method === 'FIXED' || method === 'CASH') {
      if (amount === undefined || amount === null || amount < 0) {
        throw new BadRequestException('Importe inválido');
      }
    }
  }

  validateFinancialConsistency(amountDueForPayments: Prisma.Decimal, paidAmount: Prisma.Decimal) {
    if (amountDueForPayments.lessThan(paidAmount)) {
      throw new ConflictException(`El nuevo saldo pendiente (${amountDueForPayments.toFixed(2)}) es menor al monto ya pagado (${paidAmount.toFixed(2)}).`);
    }
  }
}
