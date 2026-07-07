import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
