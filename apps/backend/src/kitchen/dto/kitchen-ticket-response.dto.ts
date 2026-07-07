import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class KitchenTicketItemDto {
  @ApiProperty() id: string;
  @ApiProperty() menuItemId: string;
  @ApiProperty() name: string;
  @ApiProperty() quantity: number;
  @ApiPropertyOptional() notes?: string | null;
}

export class KitchenTicketResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() orderId: string;
  @ApiProperty() orderNumber: string;
  @ApiPropertyOptional() tableNumber?: string | null;
  @ApiProperty() type: string;
  @ApiProperty({ type: [KitchenTicketItemDto] })
  items: KitchenTicketItemDto[];
  @ApiProperty() status: string;
  @ApiProperty() customerName: string;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty() branchId: string;
  @ApiProperty() priority: number;
  @ApiPropertyOptional() startedAt?: string | null;
  @ApiPropertyOptional() completedAt?: string | null;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
  @ApiProperty() elapsedSeconds: number;
}
