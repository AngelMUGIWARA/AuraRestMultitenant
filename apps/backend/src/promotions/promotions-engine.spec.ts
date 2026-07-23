import { BadRequestException } from '@nestjs/common';
import { Prisma, PromotionType } from '../generated/prisma-tenant';
import { PromotionValidationService, PromotionWithRelations } from './promotion-validation.service';
import { PromotionCalculator, OrderItemCalculationInput } from './promotion.calculator';
import { PromotionResolver } from './promotion.resolver';

describe('Promotions Engine Suite', () => {
  let validator: PromotionValidationService;
  let calculator: PromotionCalculator;
  let resolver: PromotionResolver;

  beforeEach(() => {
    validator = new PromotionValidationService();
    calculator = new PromotionCalculator();
    resolver = new PromotionResolver(calculator);
  });

  describe('PromotionValidationService', () => {
    const basePromo: PromotionWithRelations = {
      id: 'promo-1',
      name: 'Promoción Prueba',
      type: 'PERCENTAGE_DISCOUNT',
      value: new Prisma.Decimal(10),
      priority: 0,
      isActive: true,
    };

    it('debe validar una promoción activa y dentro de rango', () => {
      expect(() =>
        validator.validate(
          basePromo,
          {
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            subtotal: new Prisma.Decimal(100),
          },
        ),
      ).not.toThrow();
    });

    it('debe rechazar una promoción inactiva', () => {
      expect(() =>
        validator.validate(
          { ...basePromo, isActive: false },
          { status: 'PENDING', paymentStatus: 'UNPAID', subtotal: new Prisma.Decimal(100) },
        ),
      ).toThrow(BadRequestException);
    });

    it('debe rechazar promoción fuera de rango de fechas', () => {
      const expiredPromo: PromotionWithRelations = {
        ...basePromo,
        endsAt: new Date('2025-01-01T00:00:00Z'),
      };
      expect(() =>
        validator.validate(
          expiredPromo,
          { status: 'PENDING', paymentStatus: 'UNPAID', subtotal: new Prisma.Decimal(100) },
          new Date('2026-01-01T00:00:00Z'),
        ),
      ).toThrow(BadRequestException);
    });

    it('debe validar horario de minutos en zona horaria local (rango diurno)', () => {
      // 08:00 AM (480) a 04:00 PM (960)
      const dayTimePromo: PromotionWithRelations = {
        ...basePromo,
        startMinute: 480,
        endMinute: 960,
      };

      // 12:00 PM UTC = 06:00 AM Mexico_City (360 -> Inactivo)
      const dateMorning = new Date('2026-07-23T12:00:00Z');
      expect(() =>
        validator.validate(
          dayTimePromo,
          { status: 'PENDING', paymentStatus: 'UNPAID', subtotal: new Prisma.Decimal(100) },
          dateMorning,
          'America/Mexico_City',
        ),
      ).toThrow(BadRequestException);

      // 18:00 PM UTC = 12:00 PM Mexico_City (720 -> Activo)
      const dateNoon = new Date('2026-07-23T18:00:00Z');
      expect(() =>
        validator.validate(
          dayTimePromo,
          { status: 'PENDING', paymentStatus: 'UNPAID', subtotal: new Prisma.Decimal(100) },
          dateNoon,
          'America/Mexico_City',
        ),
      ).not.toThrow();
    });

    it('debe validar horario de turno nocturno (ej. 22:00 a 02:00 -> 1320 a 120)', () => {
      const nightPromo: PromotionWithRelations = {
        ...basePromo,
        startMinute: 1320, // 22:00
        endMinute: 120,   // 02:00
      };

      // 23:00 Mexico_City (1380 -> Activo)
      const dateNight = new Date('2026-07-24T05:00:00Z'); // 23:00 local (UTC-6)
      expect(() =>
        validator.validate(
          nightPromo,
          { status: 'PENDING', paymentStatus: 'UNPAID', subtotal: new Prisma.Decimal(100) },
          dateNight,
          'America/Mexico_City',
        ),
      ).not.toThrow();

      // 15:00 Mexico_City (900 -> Inactivo)
      const dateDay = new Date('2026-07-23T21:00:00Z');
      expect(() =>
        validator.validate(
          nightPromo,
          { status: 'PENDING', paymentStatus: 'UNPAID', subtotal: new Prisma.Decimal(100) },
          dateDay,
          'America/Mexico_City',
        ),
      ).toThrow(BadRequestException);
    });

    it('debe rechazar promoción si la sucursal de la orden no coincide', () => {
      const branchPromo: PromotionWithRelations = {
        ...basePromo,
        branchId: 'branch-A',
      };

      expect(() =>
        validator.validate(
          branchPromo,
          { status: 'PENDING', paymentStatus: 'UNPAID', subtotal: new Prisma.Decimal(100), branchId: 'branch-B' },
        ),
      ).toThrow(BadRequestException);
    });

    it('debe aceptar promoción si branchId es null (global)', () => {
      const globalPromo: PromotionWithRelations = {
        ...basePromo,
        branchId: null,
      };

      expect(() =>
        validator.validate(
          globalPromo,
          { status: 'PENDING', paymentStatus: 'UNPAID', subtotal: new Prisma.Decimal(100), branchId: 'branch-B' },
        ),
      ).not.toThrow();
    });

    it('debe rechazar promoción si no se cumple minPurchase', () => {
      const minPromo: PromotionWithRelations = {
        ...basePromo,
        minPurchase: new Prisma.Decimal(200),
      };

      expect(() =>
        validator.validate(
          minPromo,
          { status: 'PENDING', paymentStatus: 'UNPAID', subtotal: new Prisma.Decimal(150) },
        ),
      ).toThrow(BadRequestException);
    });

    it('debe rechazar promociones en órdenes con pagos o estado no pendiente', () => {
      expect(() =>
        validator.validate(
          basePromo,
          { status: 'PAID' as any, paymentStatus: 'PAID', subtotal: new Prisma.Decimal(100) },
        ),
      ).toThrow(BadRequestException);
    });
  });

  describe('PromotionCalculator', () => {
    const sampleItems: OrderItemCalculationInput[] = [
      {
        id: 'item-1',
        menuItemId: 'pizza-1',
        categoryId: 'cat-pizzas',
        quantity: 2,
        unitPrice: new Prisma.Decimal(100),
        subtotal: new Prisma.Decimal(200),
      },
      {
        id: 'item-2',
        menuItemId: 'soda-1',
        categoryId: 'cat-drinks',
        quantity: 3,
        unitPrice: new Prisma.Decimal(30),
        subtotal: new Prisma.Decimal(90),
      },
    ];

    it('debe calcular descuento porcentual en ítems elegibles', () => {
      const promo: PromotionWithRelations = {
        id: 'p-1',
        name: '10% OFF Pizzas',
        type: PromotionType.PERCENTAGE_DISCOUNT,
        value: new Prisma.Decimal(10),
        priority: 1,
        isActive: true,
        promotionCategories: [{ categoryId: 'cat-pizzas' }],
      };

      const benefits = calculator.computeBenefit(promo, sampleItems);
      expect(benefits).toHaveLength(1);
      expect(benefits[0].orderItemId).toBe('item-1');
      expect(benefits[0].promotionAmount.toString()).toBe('20');
      expect(benefits[0].effectiveUnitPrice.toString()).toBe('90');
    });

    it('debe aplicar tope maxAmount en descuento porcentual', () => {
      const promo: PromotionWithRelations = {
        id: 'p-2',
        name: '50% OFF max 15',
        type: PromotionType.PERCENTAGE_DISCOUNT,
        value: new Prisma.Decimal(50),
        maxAmount: new Prisma.Decimal(15),
        priority: 1,
        isActive: true,
        promotionCategories: [{ categoryId: 'cat-pizzas' }],
      };

      const benefits = calculator.computeBenefit(promo, sampleItems);
      expect(benefits[0].promotionAmount.toString()).toBe('15');
    });

    it('debe calcular precio especial por unidad', () => {
      const promo: PromotionWithRelations = {
        id: 'p-3',
        name: 'Pizza a $75',
        type: PromotionType.SPECIAL_PRICE,
        value: new Prisma.Decimal(0),
        specialPrice: new Prisma.Decimal(75),
        priority: 1,
        isActive: true,
        promotionItems: [{ menuItemId: 'pizza-1', isTarget: false }],
      };

      const benefits = calculator.computeBenefit(promo, sampleItems);
      expect(benefits[0].promotionAmount.toString()).toBe('50'); // (100-75)*2 = 50
      expect(benefits[0].effectiveUnitPrice.toString()).toBe('75');
    });

    it('debe calcular BUY_2_GET_1 gratis bonificando la unidad de menor precio', () => {
      const promo: PromotionWithRelations = {
        id: 'p-4',
        name: '2x1 en Pizzas',
        type: PromotionType.BUY_X_GET_Y,
        value: new Prisma.Decimal(1),
        buyQuantity: 1,
        getQuantity: 1,
        priority: 1,
        isActive: true,
        promotionCategories: [{ categoryId: 'cat-pizzas' }],
      };

      const benefits = calculator.computeBenefit(promo, sampleItems);
      expect(benefits[0].benefitedQuantity).toBe(1);
      expect(benefits[0].promotionAmount.toString()).toBe('100'); // 1 pizza gratis
    });

    it('debe calcular FREE_ITEM seleccionando 1 unidad del objetivo de menor precio presente', () => {
      const itemsWithMultipleTargets: OrderItemCalculationInput[] = [
        {
          id: 'item-10',
          menuItemId: 'cake-1',
          categoryId: 'cat-dessert',
          quantity: 1,
          unitPrice: new Prisma.Decimal(50),
          subtotal: new Prisma.Decimal(50),
        },
        {
          id: 'item-11',
          menuItemId: 'flan-1',
          categoryId: 'cat-dessert',
          quantity: 1,
          unitPrice: new Prisma.Decimal(30),
          subtotal: new Prisma.Decimal(30),
        },
      ];

      const promo: PromotionWithRelations = {
        id: 'p-5',
        name: 'Postre Gratis',
        type: PromotionType.FREE_ITEM,
        value: new Prisma.Decimal(1),
        minPurchase: new Prisma.Decimal(100),
        priority: 1,
        isActive: true,
        promotionCategories: [{ categoryId: 'cat-dessert' }],
      };

      const benefits = calculator.computeBenefit(promo, itemsWithMultipleTargets);
      expect(benefits).toHaveLength(1);
      expect(benefits[0].orderItemId).toBe('item-11'); // Flan es de menor precio ($30)
      expect(benefits[0].promotionAmount.toString()).toBe('30');
    });
  });

  describe('PromotionResolver', () => {
    it('debe garantizar que ninguna línea de ítem reciba 2 promociones y seleccionar la de mayor beneficio', () => {
      const items: OrderItemCalculationInput[] = [
        {
          id: 'item-1',
          menuItemId: 'pizza-1',
          categoryId: 'cat-pizzas',
          quantity: 2,
          unitPrice: new Prisma.Decimal(100),
          subtotal: new Prisma.Decimal(200),
        },
      ];

      const promo1: PromotionWithRelations = {
        id: 'promo-10% ',
        name: '10% OFF',
        type: PromotionType.PERCENTAGE_DISCOUNT,
        value: new Prisma.Decimal(10),
        priority: 1,
        isActive: true,
      };

      const promo2: PromotionWithRelations = {
        id: 'promo-20% ',
        name: '20% OFF',
        type: PromotionType.PERCENTAGE_DISCOUNT,
        value: new Prisma.Decimal(20),
        priority: 1,
        isActive: true,
      };

      const result = resolver.resolveBestPromotions([promo1, promo2], items);
      expect(result.lineBenefits.size).toBe(1);
      expect(result.lineBenefits.get('item-1')?.promotionName).toBe('20% OFF');
      expect(result.totalPromotionAmount.toString()).toBe('40');
    });

    it('debe permitir distintas promociones en distintas líneas de ítems', () => {
      const items: OrderItemCalculationInput[] = [
        {
          id: 'item-pizza',
          menuItemId: 'pizza-1',
          categoryId: 'cat-pizzas',
          quantity: 1,
          unitPrice: new Prisma.Decimal(100),
          subtotal: new Prisma.Decimal(100),
        },
        {
          id: 'item-soda',
          menuItemId: 'soda-1',
          categoryId: 'cat-drinks',
          quantity: 2,
          unitPrice: new Prisma.Decimal(30),
          subtotal: new Prisma.Decimal(60),
        },
      ];

      const pizzaPromo: PromotionWithRelations = {
        id: 'promo-pizza',
        name: 'Pizza Promo',
        type: PromotionType.PERCENTAGE_DISCOUNT,
        value: new Prisma.Decimal(10),
        priority: 1,
        isActive: true,
        promotionCategories: [{ categoryId: 'cat-pizzas' }],
      };

      const sodaPromo: PromotionWithRelations = {
        id: 'promo-soda',
        name: 'Soda Promo',
        type: PromotionType.PERCENTAGE_DISCOUNT,
        value: new Prisma.Decimal(50),
        priority: 1,
        isActive: true,
        promotionCategories: [{ categoryId: 'cat-drinks' }],
      };

      const result = resolver.resolveBestPromotions([pizzaPromo, sodaPromo], items);
      expect(result.lineBenefits.size).toBe(2);
      expect(result.totalPromotionAmount.toString()).toBe('40'); // 10 + 30
    });

    it('debe desempatar determinísticamente por promotionAmount -> priority -> id', () => {
      const items: OrderItemCalculationInput[] = [
        {
          id: 'item-1',
          menuItemId: 'pizza-1',
          categoryId: 'cat-pizzas',
          quantity: 1,
          unitPrice: new Prisma.Decimal(100),
          subtotal: new Prisma.Decimal(100),
        },
      ];

      const promoA: PromotionWithRelations = {
        id: 'promo-A',
        name: 'Promo A',
        type: PromotionType.PERCENTAGE_DISCOUNT,
        value: new Prisma.Decimal(10),
        priority: 1,
        isActive: true,
      };

      const promoB: PromotionWithRelations = {
        id: 'promo-B',
        name: 'Promo B',
        type: PromotionType.PERCENTAGE_DISCOUNT,
        value: new Prisma.Decimal(10),
        priority: 5, // Prioridad más alta
        isActive: true,
      };

      const result = resolver.resolveBestPromotions([promoA, promoB], items);
      expect(result.lineBenefits.get('item-1')?.promotionId).toBe('promo-B');
    });
  });

  describe('Verificación de la Invariante Financiera de Promociones', () => {
    it('debe cumplirse estrictamente Order.promotionAmount == sum(OrderItem.promotionAmount) == sum(OrderPromotion.promotionAmount)', () => {
      const items: OrderItemCalculationInput[] = [
        {
          id: 'item-1',
          menuItemId: 'pizza-1',
          categoryId: 'cat-pizzas',
          quantity: 2,
          unitPrice: new Prisma.Decimal(100),
          subtotal: new Prisma.Decimal(200),
        },
        {
          id: 'item-2',
          menuItemId: 'burger-1',
          categoryId: 'cat-burgers',
          quantity: 1,
          unitPrice: new Prisma.Decimal(80),
          subtotal: new Prisma.Decimal(80),
        },
      ];

      const promoPizza: PromotionWithRelations = {
        id: 'p-pizza',
        name: 'Pizza 15%',
        type: PromotionType.PERCENTAGE_DISCOUNT,
        value: new Prisma.Decimal(15),
        priority: 1,
        isActive: true,
        promotionCategories: [{ categoryId: 'cat-pizzas' }],
      };

      const promoBurger: PromotionWithRelations = {
        id: 'p-burger',
        name: 'Burger $20 OFF',
        type: PromotionType.FIXED_DISCOUNT,
        value: new Prisma.Decimal(20),
        priority: 1,
        isActive: true,
        promotionCategories: [{ categoryId: 'cat-burgers' }],
      };

      const resolved = resolver.resolveBestPromotions([promoPizza, promoBurger], items);

      const orderPromotionAmount = resolved.totalPromotionAmount;
      const sumOrderItemPromotions = Array.from(resolved.lineBenefits.values()).reduce(
        (sum, b) => sum.plus(b.promotionAmount),
        new Prisma.Decimal(0),
      );
      const sumOrderPromotions = resolved.appliedPromotionsSummary.reduce(
        (sum, p) => sum.plus(p.promotionAmount),
        new Prisma.Decimal(0),
      );

      expect(orderPromotionAmount.equals(sumOrderItemPromotions)).toBe(true);
      expect(orderPromotionAmount.equals(sumOrderPromotions)).toBe(true);
      expect(orderPromotionAmount.toString()).toBe('50'); // (200*0.15 = 30) + 20 = 50
    });
  });
});
