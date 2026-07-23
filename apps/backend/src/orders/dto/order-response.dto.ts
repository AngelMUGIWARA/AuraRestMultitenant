import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() menuItemId: string;
  @ApiProperty() name: string;
  @ApiProperty() quantity: number;
  @ApiProperty() unitPrice: number;
  @ApiProperty() totalPrice: number;
  @ApiPropertyOptional() notes?: string | null;
}

export class OrderResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty() status: string;
  @ApiProperty() paymentStatus: string;
  @ApiProperty() type: string;
  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];
  @ApiProperty() itemCount: number;
  @ApiProperty() subtotal: number;
  @ApiProperty() tax: number;
  @ApiProperty() taxRate: number;
  @ApiProperty() total: number;
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

export class PaginatedOrdersDto {
  @ApiProperty({ type: [OrderResponseDto] })
  data: OrderResponseDto[];

  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
