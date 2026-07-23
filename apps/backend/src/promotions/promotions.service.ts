import { Injectable, NotFoundException } from '@nestjs/common';
import { $Enums } from '../generated/prisma-tenant';
import { PromotionsRepository } from './promotions.repository';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private readonly promotionsRepo: PromotionsRepository) {}

  async create(schemaName: string, dto: CreatePromotionDto) {
    const promotion = await this.promotionsRepo.create(schemaName, {
      name: dto.name,
      description: dto.description,
      type: dto.type as $Enums.PromotionType,
      value: dto.value,
      minPurchase: dto.minPurchase,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      isActive: dto.isActive ?? true,
    });

    return this.toResponse(promotion);
  }

  async findAll(schemaName: string) {
    const promotions = await this.promotionsRepo.findAll(schemaName);
    return promotions.map((p) => this.toResponse(p));
  }

  async findActive(schemaName: string) {
    const promotions = await this.promotionsRepo.findActive(schemaName);
    return promotions.map((p) => this.toResponse(p));
  }

  async findById(schemaName: string, id: string) {
    const promotion = await this.promotionsRepo.findById(schemaName, id);
    if (!promotion) throw new NotFoundException('Promoción no encontrada');
    return this.toResponse(promotion);
  }

  async update(schemaName: string, id: string, dto: UpdatePromotionDto) {
    const promotion = await this.promotionsRepo.findById(schemaName, id);
    if (!promotion) throw new NotFoundException('Promoción no encontrada');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type !== undefined) data.type = dto.type as $Enums.PromotionType;
    if (dto.value !== undefined) data.value = dto.value;
    if (dto.minPurchase !== undefined) data.minPurchase = dto.minPurchase;
    if (dto.startsAt !== undefined) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) data.endsAt = new Date(dto.endsAt);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.promotionsRepo.update(schemaName, id, data);
    return this.toResponse(updated);
  }

  async delete(schemaName: string, id: string) {
    const promotion = await this.promotionsRepo.findById(schemaName, id);
    if (!promotion) throw new NotFoundException('Promoción no encontrada');
    await this.promotionsRepo.delete(schemaName, id);
  }

  private toResponse(promotion: any) {
    return {
      id: promotion.id,
      name: promotion.name,
      description: promotion.description || null,
      type: this.mapPromotionType(promotion.type),
      value: Number(promotion.value),
      minPurchase: promotion.minPurchase ? Number(promotion.minPurchase) : null,
      startsAt: promotion.startsAt?.toISOString() || null,
      endsAt: promotion.endsAt?.toISOString() || null,
      isActive: promotion.isActive,
      createdAt: promotion.createdAt?.toISOString(),
      updatedAt: promotion.updatedAt?.toISOString(),
    };
  }

  private mapPromotionType(type: string): string {
    const map: Record<string, string> = {
      PERCENTAGE_DISCOUNT: 'percentage_discount',
      FIXED_DISCOUNT: 'fixed_discount',
      BUY_X_GET_Y: 'buy_x_get_y',
      FREE_ITEM: 'free_item',
    };
    return map[type] || type?.toLowerCase();
  }
}
