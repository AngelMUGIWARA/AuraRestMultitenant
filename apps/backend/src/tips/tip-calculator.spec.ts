import { TipCalculator } from './tip-calculator';
import { Prisma } from '../generated/prisma-tenant';

describe('TipCalculator', () => {
  let calculator: TipCalculator;

  beforeEach(() => {
    calculator = new TipCalculator();
  });

  it('NONE devuelve cero', () => {
    const result = calculator.calculate({
      method: 'NONE',
      totalBeforeTip: new Prisma.Decimal('100.00'),
    });
    expect(result.tipAmount.toNumber()).toBe(0);
    expect(result.cashTipAmount.toNumber()).toBe(0);
    expect(result.chargeableTipAmount.toNumber()).toBe(0);
    expect(result.finalTotal.toNumber()).toBe(100);
    expect(result.amountDueForPayments.toNumber()).toBe(100);
  });

  it('10% sobre totalBeforeTip', () => {
    const result = calculator.calculate({
      method: 'PERCENTAGE',
      percentage: new Prisma.Decimal('10'),
      totalBeforeTip: new Prisma.Decimal('150.00'),
    });
    expect(result.tipAmount.toNumber()).toBe(15);
    expect(result.chargeableTipAmount.toNumber()).toBe(15);
    expect(result.cashTipAmount.toNumber()).toBe(0);
    expect(result.finalTotal.toNumber()).toBe(165);
    expect(result.amountDueForPayments.toNumber()).toBe(165);
  });

  it('15% con precisión decimal', () => {
    const result = calculator.calculate({
      method: 'PERCENTAGE',
      percentage: new Prisma.Decimal('15'),
      totalBeforeTip: new Prisma.Decimal('100.50'),
    });
    // 100.50 * 0.15 = 15.075 -> rounded half up = 15.08
    expect(result.tipAmount.toNumber()).toBe(15.08);
  });

  it('porcentaje cero', () => {
    const result = calculator.calculate({
      method: 'PERCENTAGE',
      percentage: new Prisma.Decimal('0'),
      totalBeforeTip: new Prisma.Decimal('100.00'),
    });
    expect(result.tipAmount.toNumber()).toBe(0);
  });

  it('porcentaje inválido no tira error aquí (validado antes) pero no falla', () => {
    const result = calculator.calculate({
      method: 'PERCENTAGE',
      totalBeforeTip: new Prisma.Decimal('100.00'),
      // percentage missing
    });
    expect(result.tipAmount.toNumber()).toBe(0);
  });

  it('importe fijo', () => {
    const result = calculator.calculate({
      method: 'FIXED',
      requestedAmount: new Prisma.Decimal('20.50'),
      totalBeforeTip: new Prisma.Decimal('100.00'),
    });
    expect(result.tipAmount.toNumber()).toBe(20.50);
    expect(result.chargeableTipAmount.toNumber()).toBe(20.50);
    expect(result.cashTipAmount.toNumber()).toBe(0);
  });

  it('importe fijo cero', () => {
    const result = calculator.calculate({
      method: 'FIXED',
      requestedAmount: new Prisma.Decimal('0'),
      totalBeforeTip: new Prisma.Decimal('100.00'),
    });
    expect(result.tipAmount.toNumber()).toBe(0);
  });

  it('CASH separa tipAmount y cashTipAmount', () => {
    const result = calculator.calculate({
      method: 'CASH',
      requestedAmount: new Prisma.Decimal('15.00'),
      totalBeforeTip: new Prisma.Decimal('100.00'),
    });
    expect(result.tipAmount.toNumber()).toBe(15);
    expect(result.cashTipAmount.toNumber()).toBe(15);
  });

  it('CASH deja chargeableTipAmount en cero', () => {
    const result = calculator.calculate({
      method: 'CASH',
      requestedAmount: new Prisma.Decimal('15.00'),
      totalBeforeTip: new Prisma.Decimal('100.00'),
    });
    expect(result.chargeableTipAmount.toNumber()).toBe(0);
  });

  it('cálculo de finalTotal', () => {
    const result = calculator.calculate({
      method: 'FIXED',
      requestedAmount: new Prisma.Decimal('10'),
      totalBeforeTip: new Prisma.Decimal('90'),
    });
    expect(result.finalTotal.toNumber()).toBe(100);
  });

  it('cálculo de amountDueForPayments para CASH', () => {
    const result = calculator.calculate({
      method: 'CASH',
      requestedAmount: new Prisma.Decimal('10'),
      totalBeforeTip: new Prisma.Decimal('90'),
    });
    expect(result.amountDueForPayments.toNumber()).toBe(90);
  });

  it('cálculo de amountDueForPayments para FIXED', () => {
    const result = calculator.calculate({
      method: 'FIXED',
      requestedAmount: new Prisma.Decimal('10'),
      totalBeforeTip: new Prisma.Decimal('90'),
    });
    expect(result.amountDueForPayments.toNumber()).toBe(100);
  });

  it('no usar floats', () => {
    const result = calculator.calculate({
      method: 'PERCENTAGE',
      percentage: new Prisma.Decimal('15'),
      totalBeforeTip: new Prisma.Decimal('100.50'),
    });
    expect(result.tipAmount).toBeInstanceOf(Prisma.Decimal);
  });

  it('redondeo consistente con la política monetaria del proyecto', () => {
    const result = calculator.calculate({
      method: 'PERCENTAGE',
      percentage: new Prisma.Decimal('10.555'),
      totalBeforeTip: new Prisma.Decimal('100'),
    });
    // 100 * 10.555 / 100 = 10.555 -> 10.56
    expect(result.tipAmount.toNumber()).toBe(10.56);
  });
});
