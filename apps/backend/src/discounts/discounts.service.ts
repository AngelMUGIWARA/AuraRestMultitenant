import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma-tenant';
import type { Discount } from '../generated/prisma-tenant';
import { DiscountsRepository } from './discounts.repository';
import { CreateDiscountDto, DiscountTypeDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@Injectable()
export class DiscountsService {
  constructor(private readonly discountsRepo: DiscountsRepository) {}

  private validateDiscountValues(
    type: DiscountTypeDto | string,
    valueStr: string,
    startsAtStr?: string,
    endsAtStr?: string,
    maxAmountStr?: string,
    minPurchaseStr?: string,
  ) {
    const val = parseFloat(valueStr);
    if (isNaN(val) || val <= 0) {
      throw new BadRequestException('El valor del descuento debe ser mayor a 0');
    }

    if (type === DiscountTypeDto.PERCENTAGE && val > 100) {
      throw new BadRequestException('El porcentaje de descuento no puede exceder el 100%');
    }

    if (maxAmountStr !== undefined && maxAmountStr !== null) {
      const maxVal = parseFloat(maxAmountStr);
      if (isNaN(maxVal) || maxVal < 0) {
        throw new BadRequestException('El tope máximo de descuento debe ser mayor o igual a 0');
      }
    }

    if (minPurchaseStr !== undefined && minPurchaseStr !== null) {
      const minVal = parseFloat(minPurchaseStr);
      if (isNaN(minVal) || minVal < 0) {
        throw new BadRequestException('La compra mínima debe ser mayor o igual a 0');
      }
    }

    let start: Date | undefined;
    let end: Date | undefined;

    if (startsAtStr) {
      start = new Date(startsAtStr);
      if (isNaN(start.getTime())) {
        throw new BadRequestException('La fecha de inicio es inválida');
      }
    }

    if (endsAtStr) {
      end = new Date(endsAtStr);
      if (isNaN(end.getTime())) {
        throw new BadRequestException('La fecha de fin es inválida');
      }
    }

    if (start && end && end <= start) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }
  }

  async create(schemaName: string, dto: CreateDiscountDto) {
    this.validateDiscountValues(
      dto.type,
      dto.value,
      dto.startsAt,
      dto.endsAt,
      dto.maxAmount,
      dto.minPurchase,
    );

    if (dto.code) {
      const existing = await this.discountsRepo.findByCode(schemaName, dto.code);
      if (existing) throw new ConflictException('El código de descuento ya existe');
    }

    const discount = await this.discountsRepo.create(schemaName, {
      name: dto.name,
      description: dto.description || null,
      code: dto.code || null,
      type: dto.type,
      value: new Prisma.Decimal(dto.value),
      isActive: dto.isActive ?? true,
      branch: dto.branchId ? { connect: { id: dto.branchId } } : undefined,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      maxAmount: dto.maxAmount ? new Prisma.Decimal(dto.maxAmount) : null,
      minPurchase: dto.minPurchase ? new Prisma.Decimal(dto.minPurchase) : null,
    });

    return this.toResponse(discount);
  }

  async findAll(schemaName: string) {
    const discounts = await this.discountsRepo.findAll(schemaName);
    return discounts.map((d) => this.toResponse(d));
  }

  async findById(schemaName: string, id: string) {
    const discount = await this.discountsRepo.findById(schemaName, id);
    if (!discount) throw new NotFoundException('Descuento no encontrado');
    return this.toResponse(discount);
  }

  async findByCode(schemaName: string, code: string) {
    const discount = await this.discountsRepo.findByCode(schemaName, code);
    if (!discount) throw new NotFoundException('Código de descuento no encontrado');
    return this.toResponse(discount);
  }

  async update(schemaName: string, id: string, dto: UpdateDiscountDto) {
    const discount = await this.discountsRepo.findById(schemaName, id);
    if (!discount) throw new NotFoundException('Descuento no encontrado');

    const effectiveType = dto.type ?? discount.type;
    const effectiveValue = dto.value ?? discount.value.toString();
    const effectiveStartsAt = dto.startsAt !== undefined ? dto.startsAt : discount.startsAt?.toISOString();
    const effectiveEndsAt = dto.endsAt !== undefined ? dto.endsAt : discount.endsAt?.toISOString();
    const effectiveMaxAmount = dto.maxAmount !== undefined ? dto.maxAmount : discount.maxAmount?.toString();
    const effectiveMinPurchase = dto.minPurchase !== undefined ? dto.minPurchase : discount.minPurchase?.toString();

    this.validateDiscountValues(
      effectiveType,
      effectiveValue,
      effectiveStartsAt,
      effectiveEndsAt,
      effectiveMaxAmount,
      effectiveMinPurchase,
    );

    if (dto.code && dto.code !== discount.code) {
      const existing = await this.discountsRepo.findByCode(schemaName, dto.code);
      if (existing) throw new ConflictException('El código de descuento ya existe');
    }

    const data: Prisma.DiscountUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description || null;
    if (dto.code !== undefined) data.code = dto.code || null;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.value !== undefined) data.value = new Prisma.Decimal(dto.value);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.branchId !== undefined) {
      data.branch = dto.branchId ? { connect: { id: dto.branchId } } : { disconnect: true };
    }
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (dto.maxAmount !== undefined) data.maxAmount = dto.maxAmount ? new Prisma.Decimal(dto.maxAmount) : null;
    if (dto.minPurchase !== undefined) data.minPurchase = dto.minPurchase ? new Prisma.Decimal(dto.minPurchase) : null;

    const updated = await this.discountsRepo.update(schemaName, id, data);
    return this.toResponse(updated);
  }

  async delete(schemaName: string, id: string) {
    const discount = await this.discountsRepo.findById(schemaName, id);
    if (!discount) throw new NotFoundException('Descuento no encontrado');

    const usedCount = await this.discountsRepo.countOrdersUsingDiscount(schemaName, id);
    if (usedCount > 0) {
      throw new ConflictException(
        'El descuento tiene órdenes históricas asociadas. Desactívalo en lugar de eliminarlo.',
      );
    }

    await this.discountsRepo.delete(schemaName, id);
  }

  public toResponse(discount: Discount) {
    return {
      id: discount.id,
      name: discount.name,
      description: discount.description || null,
      code: discount.code || null,
      type: discount.type, // 'PERCENTAGE' | 'FIXED'
      value: Number(discount.value),
      isActive: discount.isActive,
      branchId: discount.branchId || null,
      startsAt: discount.startsAt ? discount.startsAt.toISOString() : null,
      endsAt: discount.endsAt ? discount.endsAt.toISOString() : null,
      maxAmount: discount.maxAmount ? Number(discount.maxAmount) : null,
      minPurchase: discount.minPurchase ? Number(discount.minPurchase) : null,
      createdAt: discount.createdAt.toISOString(),
      updatedAt: discount.updatedAt.toISOString(),
    };
  }
}
