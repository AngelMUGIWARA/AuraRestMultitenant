import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CashSessionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() registerId!: string;
  @ApiProperty() registerName!: string;
  @ApiProperty() status!: string;
  @ApiProperty() openingFloat!: number;
  @ApiProperty() expectedCash!: number;
  @ApiProperty() countedCash!: number | null;
  @ApiProperty() difference!: number | null;
  @ApiProperty() totalPayments!: number;
  @ApiProperty() cashPayments!: number;
  @ApiProperty() refunds!: number;
  @ApiProperty() manualMovements!: number;
  @ApiProperty() openedBy!: { id: string; name: string; email: string };
  @ApiPropertyOptional() closedBy?: { id: string; name: string; email: string } | null;
  @ApiProperty() openedAt!: string;
  @ApiPropertyOptional() closedAt?: string | null;
  @ApiProperty() version!: number;
  @ApiProperty() movements!: any[];
  @ApiProperty() counts!: any[];
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class PaginatedCashSessionsDto {
  @ApiProperty({ type: [CashSessionResponseDto] }) data!: CashSessionResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}
