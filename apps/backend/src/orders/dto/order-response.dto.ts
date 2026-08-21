import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() menuItemId: string;
  @ApiProperty() name: string;
  @ApiProperty() quantity: number;
  @ApiProperty() unitPrice: number;
  @ApiProperty() totalPrice: number;
  @ApiPropertyOptional() promotionId?: string | null;
  @ApiPropertyOptional() promotionNameSnapshot?: string | null;
  @ApiPropertyOptional() promotionTypeSnapshot?: string | null;
  @ApiPropertyOptional() promotionValueSnapshot?: number | null;
  @ApiPropertyOptional() promotionQuantity?: number | null;
  @ApiPropertyOptional() promotionAmount?: number | null;
  @ApiPropertyOptional() originalUnitPrice?: number | null;
  @ApiPropertyOptional() effectiveUnitPrice?: number | null;
  @ApiPropertyOptional() notes?: string | null;
}

export class OrderPromotionSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() promotionId: string;
  @ApiProperty() name: string;
  @ApiProperty() type: string;
  @ApiProperty() value: number;
  @ApiProperty() promotionAmount: number;
}

export class OrderDiscountSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() type: string;
  @ApiProperty() value: number;
}

export class OrderResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty() status: string;
  @ApiProperty({ enum: ['unpaid', 'partial', 'paid'] })
  paymentStatus: string;
  @ApiProperty() type: string;
  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];
  @ApiProperty() itemCount: number;
  @ApiProperty() subtotal: number;
  @ApiPropertyOptional() promotionAmount?: number | null;
  @ApiPropertyOptional() promotedSubtotal?: number | null;
  @ApiPropertyOptional() discountId?: string | null;
  @ApiPropertyOptional() discountAmount?: number | null;
  @ApiPropertyOptional() taxableSubtotal?: number | null;
  @ApiPropertyOptional({ type: [OrderPromotionSummaryDto] }) appliedPromotions?: OrderPromotionSummaryDto[];
  @ApiPropertyOptional({ type: OrderDiscountSummaryDto }) discount?: OrderDiscountSummaryDto | null;
  @ApiProperty() tax: number;
  @ApiProperty() taxRate: number;
  @ApiProperty() total: number;
  @ApiProperty() paidAmount: number;
  @ApiProperty() remainingAmount: number;
  @ApiProperty() isFullyPaid: boolean;
  @ApiProperty({ type: [String] }) paymentMethods: string[];
  @ApiProperty() customerName: string;
  @ApiPropertyOptional() tableNumber?: string | null;
  @ApiPropertyOptional() tableId?: string | null;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty() branchId: string;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

export class OrderStatsResponseDto {
  @ApiProperty() totalToday: number;
  @ApiProperty() pendingOrders: number;
  @ApiProperty() preparingOrders: number;
  @ApiProperty() readyOrders: number;
  @ApiProperty() completedToday: number;
  @ApiProperty() cancelledToday: number;
  @ApiProperty() revenueToday: number;
  @ApiProperty() avgOrderValue: number;
}

export class RevenueByDayPointDto {
  @ApiProperty() date: string;
  @ApiProperty() revenue: number;
}

export class PaginatedOrdersDto {
  @ApiProperty({ type: [OrderResponseDto] })
  data: OrderResponseDto[];

  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
