import { Prisma, PromotionType } from '../generated/prisma-tenant';
import type { PromotionWithRelations } from './promotion-validation.service';

export interface OrderItemCalculationInput {
  id: string;
  menuItemId: string;
  categoryId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  subtotal: Prisma.Decimal;
}

export interface LinePromotionBenefit {
  promotionId: string;
  promotionName: string;
  promotionType: string;
  promotionValue: Prisma.Decimal;
  orderItemId: string;
  benefitedQuantity: number;
  promotionAmount: Prisma.Decimal;
  effectiveUnitPrice: Prisma.Decimal;
}

export class PromotionCalculator {
  /**
   * Calculates potential benefit for a promotion on a set of order items.
   * Returns line benefits for applicable order items.
   */
  computeBenefit(
    promotion: PromotionWithRelations,
    items: OrderItemCalculationInput[],
  ): LinePromotionBenefit[] {
    const results: LinePromotionBenefit[] = [];
    const type = promotion.type;

    // Build sets of eligible categories and menu items
    const categoryIds = new Set(
      (promotion.promotionCategories || []).map((c) => c.categoryId),
    );
    const menuItemIds = new Set(
      (promotion.promotionItems || []).map((i) => i.menuItemId),
    );
    const targetItemIds = new Set(
      (promotion.promotionItems || [])
        .filter((i) => i.isTarget)
        .map((i) => i.menuItemId),
    );

    // Filter order items that match category or menuItem constraints
    const isCategoryScoped = categoryIds.size > 0;
    const isItemScoped = menuItemIds.size > 0;

    const isItemEligible = (item: OrderItemCalculationInput): boolean => {
      if (isCategoryScoped && categoryIds.has(item.categoryId)) return true;
      if (isItemScoped && menuItemIds.has(item.menuItemId)) return true;
      if (!isCategoryScoped && !isItemScoped) return true; // Global promotion over all items
      return false;
    };

    const eligibleItems = items.filter(isItemEligible);
    if (eligibleItems.length === 0) return [];

    if (
      type === PromotionType.PERCENTAGE_DISCOUNT ||
      type === PromotionType.CATEGORY_PERCENTAGE ||
      type === 'PERCENTAGE'
    ) {
      for (const item of eligibleItems) {
        // value = 10 -> 10%
        let rawDiscount = item.subtotal
          .mul(promotion.value)
          .div(new Prisma.Decimal(100));

        if (promotion.maxAmount && rawDiscount.greaterThan(promotion.maxAmount)) {
          rawDiscount = promotion.maxAmount;
        }

        const discountAmount = Prisma.Decimal.min(rawDiscount, item.subtotal);
        if (discountAmount.greaterThan(0)) {
          const remSubtotal = item.subtotal.minus(discountAmount);
          const effectivePrice = remSubtotal.div(new Prisma.Decimal(item.quantity));

          results.push({
            promotionId: promotion.id,
            promotionName: promotion.name,
            promotionType: promotion.type,
            promotionValue: promotion.value,
            orderItemId: item.id,
            benefitedQuantity: item.quantity,
            promotionAmount: discountAmount,
            effectiveUnitPrice: effectivePrice,
          });
        }
      }
    } else if (
      type === PromotionType.FIXED_DISCOUNT ||
      type === PromotionType.CATEGORY_FIXED ||
      type === 'FIXED'
    ) {
      const eligibleSubtotal = eligibleItems.reduce(
        (sum, i) => sum.plus(i.subtotal),
        new Prisma.Decimal(0),
      );

      let totalDiscount = promotion.value;
      if (promotion.maxAmount && totalDiscount.greaterThan(promotion.maxAmount)) {
        totalDiscount = promotion.maxAmount;
      }
      totalDiscount = Prisma.Decimal.min(totalDiscount, eligibleSubtotal);

      if (totalDiscount.greaterThan(0)) {
        // Pro-rate fixed discount across eligible items
        let remainingDiscount = totalDiscount;

        for (let idx = 0; idx < eligibleItems.length; idx++) {
          const item = eligibleItems[idx];
          let itemDiscount: Prisma.Decimal;

          if (idx === eligibleItems.length - 1) {
            itemDiscount = remainingDiscount;
          } else {
            itemDiscount = totalDiscount
              .mul(item.subtotal)
              .div(eligibleSubtotal);
            remainingDiscount = remainingDiscount.minus(itemDiscount);
          }

          itemDiscount = Prisma.Decimal.min(itemDiscount, item.subtotal);
          if (itemDiscount.greaterThan(0)) {
            const remSubtotal = item.subtotal.minus(itemDiscount);
            const effectivePrice = remSubtotal.div(new Prisma.Decimal(item.quantity));

            results.push({
              promotionId: promotion.id,
              promotionName: promotion.name,
              promotionType: promotion.type,
              promotionValue: promotion.value,
              orderItemId: item.id,
              benefitedQuantity: item.quantity,
              promotionAmount: itemDiscount,
              effectiveUnitPrice: effectivePrice,
            });
          }
        }
      }
    } else if (type === PromotionType.SPECIAL_PRICE || type === 'SPECIAL_PRICE') {
      if (!promotion.specialPrice) return [];

      for (const item of eligibleItems) {
        if (item.unitPrice.greaterThan(promotion.specialPrice)) {
          const unitSaving = item.unitPrice.minus(promotion.specialPrice);
          const lineSaving = unitSaving.mul(new Prisma.Decimal(item.quantity));

          results.push({
            promotionId: promotion.id,
            promotionName: promotion.name,
            promotionType: promotion.type,
            promotionValue: promotion.specialPrice,
            orderItemId: item.id,
            benefitedQuantity: item.quantity,
            promotionAmount: lineSaving,
            effectiveUnitPrice: promotion.specialPrice,
          });
        }
      }
    } else if (type === PromotionType.BUY_X_GET_Y || type === 'BUY_X_GET_Y') {
      const buyQty = promotion.buyQuantity || 1;
      const getQty = promotion.getQuantity || 1;
      const groupSize = buyQty + getQty;

      // Check if target items are specified for Y
      const targetItems = targetItemIds.size > 0
        ? eligibleItems.filter((i) => targetItemIds.has(i.menuItemId))
        : eligibleItems;

      const totalQuantity = eligibleItems.reduce((sum, i) => sum + i.quantity, 0);
      const applications = Math.floor(totalQuantity / groupSize);
      if (applications <= 0) return [];

      const totalFreeUnits = applications * getQty;
      if (totalFreeUnits <= 0) return [];

      // Sort target items by unitPrice ascending for lowest price bonification
      const sortedTargetItems = [...targetItems].sort((a, b) => {
        const cmp = a.unitPrice.minus(b.unitPrice).toNumber();
        if (cmp !== 0) return cmp;
        return a.menuItemId.localeCompare(b.menuItemId);
      });

      let remainingFreeUnits = totalFreeUnits;

      for (const item of sortedTargetItems) {
        if (remainingFreeUnits <= 0) break;

        const freeInThisItem = Math.min(item.quantity, remainingFreeUnits);
        remainingFreeUnits -= freeInThisItem;

        const lineSaving = item.unitPrice.mul(new Prisma.Decimal(freeInThisItem));
        const remSubtotal = item.subtotal.minus(lineSaving);
        const effectivePrice = remSubtotal.div(new Prisma.Decimal(item.quantity));

        results.push({
          promotionId: promotion.id,
          promotionName: promotion.name,
          promotionType: promotion.type,
          promotionValue: new Prisma.Decimal(getQty),
          orderItemId: item.id,
          benefitedQuantity: freeInThisItem,
          promotionAmount: lineSaving,
          effectiveUnitPrice: effectivePrice,
        });
      }
    } else if (type === PromotionType.FREE_ITEM || type === 'FREE_ITEM') {
      // 1 unit 100% free if present in order
      const targetItems = targetItemIds.size > 0
        ? eligibleItems.filter((i) => targetItemIds.has(i.menuItemId))
        : eligibleItems;

      if (targetItems.length === 0) return [];

      // Sort by unitPrice ascending then menuItemId ascending
      const sortedTargetItems = [...targetItems].sort((a, b) => {
        const cmp = a.unitPrice.minus(b.unitPrice).toNumber();
        if (cmp !== 0) return cmp;
        return a.menuItemId.localeCompare(b.menuItemId);
      });

      // Free item is 1 unit of lowest price target item present
      const bestTarget = sortedTargetItems[0];
      const lineSaving = bestTarget.unitPrice; // 1 unit free
      const remSubtotal = bestTarget.subtotal.minus(lineSaving);
      const effectivePrice = remSubtotal.div(new Prisma.Decimal(bestTarget.quantity));

      results.push({
        promotionId: promotion.id,
        promotionName: promotion.name,
        promotionType: promotion.type,
        promotionValue: new Prisma.Decimal(1),
        orderItemId: bestTarget.id,
        benefitedQuantity: 1,
        promotionAmount: lineSaving,
        effectiveUnitPrice: effectivePrice,
      });
    }

    return results;
  }
}
