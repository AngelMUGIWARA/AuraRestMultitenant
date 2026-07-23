import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma-tenant';
import { RefundCalculator } from './refund-calculator';

@Injectable()
export class RefundValidationService {
  validateRefundAmount(
    amountToRefund: Prisma.Decimal,
    paymentAmount: Prisma.Decimal,
    paymentRefundedAmount: Prisma.Decimal,
  ): void {
    if (amountToRefund.lessThanOrEqualTo(0)) {
      throw new BadRequestException('El monto del reembolso debe ser mayor a cero.');
    }

    const refundableAmount = RefundCalculator.getPaymentRefundableAmount(
      paymentAmount,
      paymentRefundedAmount,
    );

    if (amountToRefund.greaterThan(refundableAmount)) {
      throw new BadRequestException(
        `El monto del reembolso excede el saldo reembolsable del pago. Disponible: ${refundableAmount.toFixed(2)}`,
      );
    }
  }

  validatePaymentStatus(status: string): void {
    if (status !== 'COMPLETED' && status !== 'PARTIALLY_REFUNDED') {
      throw new BadRequestException(`No se puede reembolsar un pago con estado ${status}.`);
    }
  }
}
