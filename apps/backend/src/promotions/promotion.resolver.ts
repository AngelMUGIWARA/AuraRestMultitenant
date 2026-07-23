import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma-tenant';
import { PromotionCalculator, LinePromotionBenefit, OrderItemCalculationInput } from './promotion.calculator';
import type { PromotionWithRelations } from './promotion-validation.service';

export interface ResolvedPromotionsResult {
  lineBenefits: Map<string, LinePromotionBenefit>; // orderItemId -> LinePromotionBenefit
  appliedPromotionsSummary: Array<{
    promotionId: string;
    name: string;
    type: string;
    value: Prisma.Decimal;
    promotionAmount: Prisma.Decimal;
    affectedItemIds: string[];
  }>;
  totalPromotionAmount: Prisma.Decimal;
}

@Injectable()
export class PromotionResolver {
  constructor(private readonly calculator: PromotionCalculator) {}

  /**
   * Resolves conflicts among promotions for an order's items.
   * GUARANTEE: Each order line item receives at most 1 promotion.
   * GUARANTEE: Deterministic tie-breaking favoring highest monetary benefit to customer.
   */
  resolveBestPromotions(
    activePromotions: PromotionWithRelations[],
    items: OrderItemCalculationInput[],
  ): ResolvedPromotionsResult {
    const lineBenefits = new Map<string, LinePromotionBenefit>();
    const assignedItemIds = new Set<string>();

    if (activePromotions.length === 0 || items.length === 0) {
      return {
        lineBenefits,
        appliedPromotionsSummary: [],
        totalPromotionAmount: new Prisma.Decimal(0),
      };
    }

    // 1. Evaluate candidate benefits for each promotion
    const candidatePromotions: Array<{
      promotion: PromotionWithRelations;
      benefits: LinePromotionBenefit[];
      totalCandidateAmount: Prisma.Decimal;
    }> = [];

    for (const promo of activePromotions) {
      const benefits = this.calculator.computeBenefit(promo, items);
      if (benefits.length > 0) {
        const totalCandidateAmount = benefits.reduce(
          (sum, b) => sum.plus(b.promotionAmount),
          new Prisma.Decimal(0),
        );
        candidatePromotions.push({ promotion: promo, benefits, totalCandidateAmount });
      }
    }

    // 2. Sort candidate promotions deterministically:
    //    a) totalCandidateAmount DESC
    //    b) priority DESC
    //    c) startsAt ASC
    //    d) id ASC
    candidatePromotions.sort((a, b) => {
      const amtCmp = b.totalCandidateAmount.minus(a.totalCandidateAmount).toNumber();
      if (amtCmp !== 0) return amtCmp;

      const prioCmp = (b.promotion.priority || 0) - (a.promotion.priority || 0);
      if (prioCmp !== 0) return prioCmp;

      const dateA = a.promotion.startsAt ? a.promotion.startsAt.getTime() : 0;
      const dateB = b.promotion.startsAt ? b.promotion.startsAt.getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;

      return a.promotion.id.localeCompare(b.promotion.id);
    });

    // 3. Assign promotions without overlapping items
    const appliedPromotionsMap = new Map<
      string,
      {
        promotionId: string;
        name: string;
        type: string;
        value: Prisma.Decimal;
        promotionAmount: Prisma.Decimal;
        affectedItemIds: string[];
      }
    >();

    for (const candidate of candidatePromotions) {
      // Check if any benefit line collides with an already assigned item
      const unassignedBenefits = candidate.benefits.filter(
        (b) => !assignedItemIds.has(b.orderItemId),
      );

      if (unassignedBenefits.length === 0) continue;

      let promoTotal = new Prisma.Decimal(0);
      const affectedItems: string[] = [];

      for (const benefit of unassignedBenefits) {
        if (!assignedItemIds.has(benefit.orderItemId)) {
          assignedItemIds.add(benefit.orderItemId);
          lineBenefits.set(benefit.orderItemId, benefit);
          promoTotal = promoTotal.plus(benefit.promotionAmount);
          affectedItems.push(benefit.orderItemId);
        }
      }

      if (affectedItems.length > 0 && promoTotal.greaterThan(0)) {
        appliedPromotionsMap.set(candidate.promotion.id, {
          promotionId: candidate.promotion.id,
          name: candidate.promotion.name,
          type: candidate.promotion.type,
          value: candidate.promotion.value,
          promotionAmount: promoTotal,
          affectedItemIds: affectedItems,
        });
      }
    }

    const appliedPromotionsSummary = Array.from(appliedPromotionsMap.values());
    const totalPromotionAmount = Array.from(lineBenefits.values()).reduce(
      (sum, b) => sum.plus(b.promotionAmount),
      new Prisma.Decimal(0),
    );

    return {
      lineBenefits,
      appliedPromotionsSummary,
      totalPromotionAmount,
    };
  }
}
