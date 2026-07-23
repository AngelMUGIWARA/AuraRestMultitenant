import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateDiscountDto } from './discounts/dto/create-discount.dto';
import { UpdateDiscountDto } from './discounts/dto/update-discount.dto';
import { CreatePromotionDto } from './promotions/dto/create-promotion.dto';
import { UpdatePromotionDto } from './promotions/dto/update-promotion.dto';
import { UpdateKitchenTicketStatusDto } from './kitchen/dto/update-kitchen-ticket-status.dto';
import { KitchenTicketStatus } from './generated/prisma-tenant';
import { UpdatePriceDto } from './menus/dto/update-price.dto';
import { CreateMenuDto } from './menus/dto/create-menu.dto';
import { CreateCategoryDto } from './categories/dto/create-category.dto';
import { CreateBranchDto } from './branches/dto/branch.dto';
import { ReservationQueryDto } from './reservations/dto/reservation-query.dto';
import { UpdateTableStatusDto } from './tables/dto/update-table.dto';
import { TableStatus } from './generated/prisma-tenant';
import { TableQueryDto } from './tables/dto/table-query.dto';

async function validateDto(DtoClass: any, data: Record<string, unknown>) {
  const instance = plainToInstance(DtoClass, data);
  return validate(instance as any);
}

function baseDiscount(): Record<string, unknown> {
  return { name: '20% OFF', type: 'PERCENTAGE', value: '20' };
}

function basePromotion(): Record<string, unknown> {
  return { name: 'Happy Hour', type: 'PERCENTAGE_DISCOUNT', value: '10' };
}

function baseMenu(): Record<string, unknown> {
  return { name: 'Tacos', price: 89.9, categoryId: 'cat_001' };
}

function baseCategory(): Record<string, unknown> {
  return { name: 'Entradas' };
}

function baseBranch(): Record<string, unknown> {
  return { name: 'Sucursal Centro' };
}

describe('DTO Validation', () => {

  describe('Discount — Partial<CreateDto> eliminated', () => {
    it('UpdateDiscountDto is a real class (not Partial type)', () => {
      expect(typeof UpdateDiscountDto).toBe('function');
      const proto = Object.getOwnPropertyNames(UpdateDiscountDto.prototype);
      expect(proto).toContain('constructor');
    });

    it('rejects empty name on create', async () => {
      const errors = await validateDto(CreateDiscountDto, { ...baseDiscount(), name: '' });
      expect(errors.length).toBeGreaterThan(0);
      const nameErrors = errors.filter(e => e.property === 'name');
      expect(nameErrors.length).toBeGreaterThan(0);
    });

    it('rejects empty name on update', async () => {
      const errors = await validateDto(UpdateDiscountDto, { name: '' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('accepts valid update with partial fields', async () => {
      const errors = await validateDto(UpdateDiscountDto, { name: 'New Name' });
      expect(errors.length).toBe(0);
    });

    it('rejects empty value on create', async () => {
      const errors = await validateDto(CreateDiscountDto, { ...baseDiscount(), value: '' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects invalid enum type', async () => {
      const errors = await validateDto(CreateDiscountDto, { ...baseDiscount(), type: 'INVALID' });
      expect(errors.length).toBeGreaterThan(0);
      const typeErrors = errors.filter(e => e.property === 'type');
      expect(typeErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Promotion — Partial<CreateDto> eliminated', () => {
    it('UpdatePromotionDto is a real class', () => {
      expect(typeof UpdatePromotionDto).toBe('function');
    });

    it('rejects empty name on create', async () => {
      const errors = await validateDto(CreatePromotionDto, { ...basePromotion(), name: '' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects empty name on update', async () => {
      const errors = await validateDto(UpdatePromotionDto, { name: '' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('accepts valid partial update', async () => {
      const errors = await validateDto(UpdatePromotionDto, { description: 'Updated' });
      expect(errors.length).toBe(0);
    });

    it('rejects empty value', async () => {
      const errors = await validateDto(CreatePromotionDto, { ...basePromotion(), value: '' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects invalid enum type', async () => {
      const errors = await validateDto(CreatePromotionDto, { ...basePromotion(), type: 'BOGO' });
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Kitchen — IsEnum validation', () => {
    it('accepts IN_PROGRESS', async () => {
      const errors = await validateDto(UpdateKitchenTicketStatusDto, { status: 'IN_PROGRESS' });
      expect(errors.length).toBe(0);
    });

    it('accepts READY', async () => {
      const errors = await validateDto(UpdateKitchenTicketStatusDto, { status: 'READY' });
      expect(errors.length).toBe(0);
    });

    it('accepts DELIVERED', async () => {
      const errors = await validateDto(UpdateKitchenTicketStatusDto, { status: 'DELIVERED' });
      expect(errors.length).toBe(0);
    });

    it('accepts PENDING', async () => {
      const errors = await validateDto(UpdateKitchenTicketStatusDto, { status: 'PENDING' });
      expect(errors.length).toBe(0);
    });

    it('rejects free text string', async () => {
      const errors = await validateDto(UpdateKitchenTicketStatusDto, { status: 'done' });
      expect(errors.length).toBeGreaterThan(0);
      const statusErrors = errors.filter(e => e.property === 'status');
      expect(statusErrors.length).toBeGreaterThan(0);
    });

    it('rejects INVALID_STATUS', async () => {
      const errors = await validateDto(UpdateKitchenTicketStatusDto, { status: 'INVALID_STATUS' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects empty string', async () => {
      const errors = await validateDto(UpdateKitchenTicketStatusDto, { status: '' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('KitchenTicketStatus enum has exactly 4 values matching Prisma schema', () => {
      const values = Object.values(KitchenTicketStatus);
      expect(values).toEqual(['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED']);
      expect(values).toHaveLength(4);
    });
  });

  describe('Price — numeric validation', () => {
    it('accepts valid price', async () => {
      const errors = await validateDto(UpdatePriceDto, { price: 129.99 });
      expect(errors.length).toBe(0);
    });

    it('accepts zero', async () => {
      const errors = await validateDto(UpdatePriceDto, { price: 0 });
      expect(errors.length).toBe(0);
    });

    it('rejects negative price', async () => {
      const errors = await validateDto(UpdatePriceDto, { price: -1 });
      expect(errors.length).toBeGreaterThan(0);
      const priceErrors = errors.filter(e => e.property === 'price');
      expect(priceErrors.length).toBeGreaterThan(0);
    });

    it('rejects NaN', async () => {
      const errors = await validateDto(UpdatePriceDto, { price: NaN });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects Infinity', async () => {
      const errors = await validateDto(UpdatePriceDto, { price: Infinity });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects string instead of number', async () => {
      const errors = await validateDto(UpdatePriceDto, { price: 'abc' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('transforms string number to number via Type decorator', async () => {
      const errors = await validateDto(UpdatePriceDto, { price: '99.9' });
      expect(errors.length).toBe(0);
    });
  });

  describe('Strings — empty string rejection', () => {
    it('CreateMenuDto rejects empty name', async () => {
      const errors = await validateDto(CreateMenuDto, { ...baseMenu(), name: '' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('CreateMenuDto rejects empty categoryId', async () => {
      const errors = await validateDto(CreateMenuDto, { ...baseMenu(), categoryId: '' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('CreateCategoryDto rejects empty name', async () => {
      const errors = await validateDto(CreateCategoryDto, { ...baseCategory(), name: '' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('CreateBranchDto rejects empty name', async () => {
      const errors = await validateDto(CreateBranchDto, { ...baseBranch(), name: '' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('CreateMenuDto accepts valid data', async () => {
      const errors = await validateDto(CreateMenuDto, baseMenu());
      expect(errors.length).toBe(0);
    });

    it('CreateCategoryDto accepts valid data', async () => {
      const errors = await validateDto(CreateCategoryDto, baseCategory());
      expect(errors.length).toBe(0);
    });

    it('CreateBranchDto accepts valid data', async () => {
      const errors = await validateDto(CreateBranchDto, baseBranch());
      expect(errors.length).toBe(0);
    });
  });

  describe('Pagination — limits', () => {
    it('ReservationQueryDto: page=0 is rejected', async () => {
      const errors = await validateDto(ReservationQueryDto, { page: 0 });
      const pageErrors = errors.filter(e => e.property === 'page');
      expect(pageErrors.length).toBeGreaterThan(0);
    });

    it('ReservationQueryDto: limit=999999 is rejected', async () => {
      const errors = await validateDto(ReservationQueryDto, { limit: 999999 });
      const limitErrors = errors.filter(e => e.property === 'limit');
      expect(limitErrors.length).toBeGreaterThan(0);
    });

    it('ReservationQueryDto: limit=20 is accepted', async () => {
      const errors = await validateDto(ReservationQueryDto, { limit: 20 });
      expect(errors.length).toBe(0);
    });

    it('ReservationQueryDto: limit=1 is accepted', async () => {
      const errors = await validateDto(ReservationQueryDto, { limit: 1 });
      expect(errors.length).toBe(0);
    });

    it('ReservationQueryDto: limit=100 is accepted', async () => {
      const errors = await validateDto(ReservationQueryDto, { limit: 100 });
      expect(errors.length).toBe(0);
    });

    it('ReservationQueryDto: limit=101 is rejected', async () => {
      const errors = await validateDto(ReservationQueryDto, { limit: 101 });
      const limitErrors = errors.filter(e => e.property === 'limit');
      expect(limitErrors.length).toBeGreaterThan(0);
    });

    it('ReservationQueryDto: empty body is accepted (all optional)', async () => {
      const errors = await validateDto(ReservationQueryDto, {});
      expect(errors.length).toBe(0);
    });

    it('TableQueryDto: page=0 is rejected', async () => {
      const errors = await validateDto(TableQueryDto, { page: 0 });
      const pageErrors = errors.filter(e => e.property === 'page');
      expect(pageErrors.length).toBeGreaterThan(0);
    });

    it('TableQueryDto: limit=999999 is rejected', async () => {
      const errors = await validateDto(TableQueryDto, { limit: 999999 });
      const limitErrors = errors.filter(e => e.property === 'limit');
      expect(limitErrors.length).toBeGreaterThan(0);
    });

    it('TableQueryDto: limit=20 is accepted', async () => {
      const errors = await validateDto(TableQueryDto, { limit: 20 });
      expect(errors.length).toBe(0);
    });

    it('TableQueryDto: limit=100 is accepted', async () => {
      const errors = await validateDto(TableQueryDto, { limit: 100 });
      expect(errors.length).toBe(0);
    });

    it('TableQueryDto: limit=101 is rejected', async () => {
      const errors = await validateDto(TableQueryDto, { limit: 101 });
      const limitErrors = errors.filter(e => e.property === 'limit');
      expect(limitErrors.length).toBeGreaterThan(0);
    });
  });

  describe('TableStatus — IsEnum validation', () => {
    it('accepts AVAILABLE', async () => {
      const errors = await validateDto(UpdateTableStatusDto, { status: 'AVAILABLE' });
      expect(errors.length).toBe(0);
    });

    it('accepts OCCUPIED', async () => {
      const errors = await validateDto(UpdateTableStatusDto, { status: 'OCCUPIED' });
      expect(errors.length).toBe(0);
    });

    it('accepts RESERVED', async () => {
      const errors = await validateDto(UpdateTableStatusDto, { status: 'RESERVED' });
      expect(errors.length).toBe(0);
    });

    it('accepts MAINTENANCE', async () => {
      const errors = await validateDto(UpdateTableStatusDto, { status: 'MAINTENANCE' });
      expect(errors.length).toBe(0);
    });

    it('rejects lowercase free', async () => {
      const errors = await validateDto(UpdateTableStatusDto, { status: 'free' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects INVALID_STATUS', async () => {
      const errors = await validateDto(UpdateTableStatusDto, { status: 'INVALID_STATUS' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects empty string', async () => {
      const errors = await validateDto(UpdateTableStatusDto, { status: '' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects missing status', async () => {
      const errors = await validateDto(UpdateTableStatusDto, {});
      expect(errors.length).toBeGreaterThan(0);
    });

    it('TableStatus enum has exactly 4 values matching Prisma schema', () => {
      const values = Object.values(TableStatus);
      expect(values).toEqual(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE']);
      expect(values).toHaveLength(4);
    });
  });
});
