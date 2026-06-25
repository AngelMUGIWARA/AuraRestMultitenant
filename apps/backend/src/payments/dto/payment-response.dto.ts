import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() orderId: string;
  @ApiProperty() amount: number;
  @ApiProperty() method: string;
  @ApiProperty() status: string;
  @ApiPropertyOptional() reference?: string | null;
  @ApiPropertyOptional() tipAmount?: number | null;
  @ApiProperty() createdAt: string;
}
