import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { $Enums } from '../generated/prisma-tenant';
import { PromotionsRepository } from './promotions.repository';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private readonly promotionsRepo: PromotionsRepository) {}

  async create(schemaName: string, dto: CreatePromotionDto) {
    const promotionCategories = (dto.categoryIds || []).map((id) => ({
      category: { connect: { id } },
    }));

    const regularItemConnects = (dto.itemIds || []).map((id) => ({
      menuItem: { connect: { id } },
      isTarget: false,
    }));

    const targetItemConnects = (dto.targetItemIds || []).map((id) => ({
      menuItem: { connect: { id } },
      isTarget: true,
    }));

    const promotionItems = [...regularItemConnects, ...targetItemConnects];

    const promotion = await this.promotionsRepo.create(schemaName, {
      name: dto.name,
      description: dto.description,
      type: dto.type as $Enums.PromotionType,
      value: dto.value,
      minPurchase: dto.minPurchase ?? null,
      maxAmount: dto.maxAmount ?? null,
      specialPrice: dto.specialPrice ?? null,
      buyQuantity: dto.buyQuantity ?? null,
      getQuantity: dto.getQuantity ?? null,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      startMinute: dto.startMinute ?? null,
      endMinute: dto.endMinute ?? null,
      priority: dto.priority ?? 0,
      isActive: dto.isActive ?? true,
      branch: dto.branchId ? { connect: { id: dto.branchId } } : undefined,
      promotionCategories: promotionCategories.length > 0 ? { create: promotionCategories } : undefined,
      promotionItems: promotionItems.length > 0 ? { create: promotionItems } : undefined,
    });

    return this.toResponse(promotion);
  }

  async findAll(schemaName: string) {
    const promotions = await this.promotionsRepo.findAll(schemaName);
    return promotions.map((p) => this.toResponse(p));
  }

  async findActive(schemaName: string) {
    const promotions = await this.promotionsRepo.findActiveWithRelations(schemaName);
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
    if (dto.maxAmount !== undefined) data.maxAmount = dto.maxAmount;
    if (dto.specialPrice !== undefined) data.specialPrice = dto.specialPrice;
    if (dto.buyQuantity !== undefined) data.buyQuantity = dto.buyQuantity;
    if (dto.getQuantity !== undefined) data.getQuantity = dto.getQuantity;
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (dto.startMinute !== undefined) data.startMinute = dto.startMinute;
    if (dto.endMinute !== undefined) data.endMinute = dto.endMinute;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.branchId !== undefined) {
      data.branch = dto.branchId ? { connect: { id: dto.branchId } } : { disconnect: true };
    }

    const updated = await this.promotionsRepo.update(schemaName, id, data);
    return this.toResponse(updated);
  }

  async delete(schemaName: string, id: string) {
    const promotion = await this.promotionsRepo.findById(schemaName, id);
    if (!promotion) throw new NotFoundException('Promoción no encontrada');

    // Protect historical order usage
    if (promotion.orderPromotions && promotion.orderPromotions.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar una promoción que ha sido utilizada en órdenes históricas. En su lugar, desactívela (isActive=false).',
      );
    }

    await this.promotionsRepo.delete(schemaName, id);
  }

  private toResponse(promotion: any) {
    return {
      id: promotion.id,
      name: promotion.name,
      description: promotion.description || null,
      type: promotion.type,
      value: Number(promotion.value),
      minPurchase: promotion.minPurchase ? Number(promotion.minPurchase) : null,
      maxAmount: promotion.maxAmount ? Number(promotion.maxAmount) : null,
      specialPrice: promotion.specialPrice ? Number(promotion.specialPrice) : null,
      buyQuantity: promotion.buyQuantity ?? null,
      getQuantity: promotion.getQuantity ?? null,
      startsAt: promotion.startsAt?.toISOString() || null,
      endsAt: promotion.endsAt?.toISOString() || null,
      startMinute: promotion.startMinute ?? null,
      endMinute: promotion.endMinute ?? null,
      priority: promotion.priority ?? 0,
      isActive: promotion.isActive,
      branchId: promotion.branchId || null,
      categoryIds: (promotion.promotionCategories || []).map((c: any) => c.categoryId),
      itemIds: (promotion.promotionItems || []).filter((i: any) => !i.isTarget).map((i: any) => i.menuItemId),
      targetItemIds: (promotion.promotionItems || []).filter((i: any) => i.isTarget).map((i: any) => i.menuItemId),
      createdAt: promotion.createdAt?.toISOString(),
      updatedAt: promotion.updatedAt?.toISOString(),
    };
  }
}
