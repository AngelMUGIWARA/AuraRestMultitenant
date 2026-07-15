import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { $Enums } from '../generated/prisma-tenant';
import { DiscountsRepository } from './discounts.repository';
import { CreateDiscountDto } from './dto/create-discount.dto';

@Injectable()
export class DiscountsService {
  constructor(private readonly discountsRepo: DiscountsRepository) {}

  async create(schemaName: string, dto: CreateDiscountDto) {
    if (dto.code) {
      const existing = await this.discountsRepo.findByCode(schemaName, dto.code);
      if (existing) throw new ConflictException('El código de descuento ya existe');
    }

    const discount = await this.discountsRepo.create(schemaName, {
      name: dto.name,
      code: dto.code,
      type: dto.type as $Enums.DiscountType,
      value: dto.value,
      isActive: dto.isActive ?? true,
      maxAmount: dto.maxAmount,
      minPurchase: dto.minPurchase,
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

  async update(schemaName: string, id: string, dto: Partial<CreateDiscountDto>) {
    const discount = await this.discountsRepo.findById(schemaName, id);
    if (!discount) throw new NotFoundException('Descuento no encontrado');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.type !== undefined) data.type = dto.type as $Enums.DiscountType;
    if (dto.value !== undefined) data.value = dto.value;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.maxAmount !== undefined) data.maxAmount = dto.maxAmount;
    if (dto.minPurchase !== undefined) data.minPurchase = dto.minPurchase;

    const updated = await this.discountsRepo.update(schemaName, id, data);
    return this.toResponse(updated);
  }

  async delete(schemaName: string, id: string) {
    const discount = await this.discountsRepo.findById(schemaName, id);
    if (!discount) throw new NotFoundException('Descuento no encontrado');
    await this.discountsRepo.delete(schemaName, id);
  }

  private toResponse(discount: any) {
    return {
      id: discount.id,
      name: discount.name,
      code: discount.code || null,
      type: discount.type?.toLowerCase() || 'fixed',
      value: Number(discount.value),
      isActive: discount.isActive,
      maxAmount: discount.maxAmount ? Number(discount.maxAmount) : null,
      minPurchase: discount.minPurchase ? Number(discount.minPurchase) : null,
      createdAt: discount.createdAt?.toISOString(),
      updatedAt: discount.updatedAt?.toISOString(),
    };
  }
}
