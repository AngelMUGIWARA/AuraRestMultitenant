import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TableResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() number: number;
  @ApiPropertyOptional() name?: string | null;
  @ApiProperty() capacity: number;
  @ApiProperty() status: string;
  @ApiPropertyOptional() locationZone?: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}
