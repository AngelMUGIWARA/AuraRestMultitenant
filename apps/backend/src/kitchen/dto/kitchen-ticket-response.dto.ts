import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class KitchenItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderItemId!: string;
  @ApiProperty() menuItemName!: string;
  @ApiProperty() quantity!: number;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() version!: number;
  @ApiPropertyOptional() startedAt?: string | null;
  @ApiPropertyOptional() readyAt?: string | null;
}

export class KitchenTicketResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderId!: string;
  @ApiProperty() orderNumber!: string;
  @ApiPropertyOptional() branchId?: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() priority!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ type: [KitchenItemResponseDto] }) items!: KitchenItemResponseDto[];
  @ApiPropertyOptional() customerName?: string | null;
  @ApiPropertyOptional() tableNumber?: string | null;
  @ApiPropertyOptional() notes?: string | null;
  @ApiPropertyOptional() startedAt?: string | null;
  @ApiPropertyOptional() readyAt?: string | null;
  @ApiPropertyOptional() deliveredAt?: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class PaginatedKitchenTicketsDto {
  @ApiProperty({ type: [KitchenTicketResponseDto] }) data!: KitchenTicketResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}
