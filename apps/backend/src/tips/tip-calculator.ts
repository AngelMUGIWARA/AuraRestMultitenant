import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma-tenant';
import type { TipMethod } from '../generated/prisma-tenant';

export interface TipCalculationParams {
  method: TipMethod;
  totalBeforeTip: Prisma.Decimal;
  percentage?: Prisma.Decimal;
  requestedAmount?: Prisma.Decimal;
}

export interface TipCalculationResult {
  tipAmount: Prisma.Decimal;
  cashTipAmount: Prisma.Decimal;
  chargeableTipAmount: Prisma.Decimal;
  finalTotal: Prisma.Decimal;
  amountDueForPayments: Prisma.Decimal;
}

@Injectable()
export class TipCalculator {
  calculate(params: TipCalculationParams): TipCalculationResult {
    let tipAmount = new Prisma.Decimal(0);
    let cashTipAmount = new Prisma.Decimal(0);
    let chargeableTipAmount = new Prisma.Decimal(0);

    switch (params.method) {
      case 'NONE':
        break;
      case 'PERCENTAGE':
        if (params.percentage) {
          tipAmount = params.totalBeforeTip
            .mul(params.percentage)
            .dividedBy(100)
            .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
          chargeableTipAmount = tipAmount;
        }
        break;
      case 'FIXED':
        if (params.requestedAmount) {
          tipAmount = params.requestedAmount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
          chargeableTipAmount = tipAmount;
        }
        break;
      case 'CASH':
        if (params.requestedAmount) {
          tipAmount = params.requestedAmount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
          cashTipAmount = tipAmount;
        }
        break;
    }

    const finalTotal = params.totalBeforeTip.plus(tipAmount);
    const amountDueForPayments = params.totalBeforeTip.plus(chargeableTipAmount);

    return {
      tipAmount,
      cashTipAmount,
      chargeableTipAmount,
      finalTotal,
      amountDueForPayments,
    };
  }
}
