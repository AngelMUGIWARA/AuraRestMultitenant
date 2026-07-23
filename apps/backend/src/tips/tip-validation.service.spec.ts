import { TipValidationService } from './tip-validation.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, OrderStatus } from '../generated/prisma-tenant';

describe('TipValidationService', () => {
  let service: TipValidationService;

  beforeEach(() => {
    service = new TipValidationService();
  });

  it('orden permitida', () => {
    expect(() => service.validateOrderStatus(OrderStatus.IN_PROGRESS)).not.toThrow();
  });

  it('orden cancelada tira error', () => {
    expect(() => service.validateOrderStatus(OrderStatus.CANCELLED)).toThrow(BadRequestException);
  });

  it('orden pagada tira error', () => {
    expect(() => service.validateOrderStatus(OrderStatus.PAID)).toThrow(BadRequestException);
  });

  it('porcentaje negativo tira error', () => {
    expect(() => service.validateTipMethodParams('PERCENTAGE', -5)).toThrow(BadRequestException);
  });

  it('porcentaje superior al máximo tira error', () => {
    expect(() => service.validateTipMethodParams('PERCENTAGE', 150)).toThrow(BadRequestException);
  });

  it('importe negativo tira error', () => {
    expect(() => service.validateTipMethodParams('FIXED', undefined, -10)).toThrow(BadRequestException);
  });

  it('campos incompatibles con método tira error', () => {
    expect(() => service.validateTipMethodParams('PERCENTAGE', undefined, 10)).toThrow(BadRequestException);
  });

  it('cambio que causa sobrepago', () => {
    const amountDue = new Prisma.Decimal('100');
    const paid = new Prisma.Decimal('120');
    expect(() => service.validateFinancialConsistency(amountDue, paid)).toThrow(ConflictException);
  });

  it('eliminación que causa sobrepago', () => {
    const amountDue = new Prisma.Decimal('90');
    const paid = new Prisma.Decimal('100');
    expect(() => service.validateFinancialConsistency(amountDue, paid)).toThrow(ConflictException);
  });

  it('propina válida con pago parcial', () => {
    const amountDue = new Prisma.Decimal('150');
    const paid = new Prisma.Decimal('100');
    expect(() => service.validateFinancialConsistency(amountDue, paid)).not.toThrow();
  });
});
