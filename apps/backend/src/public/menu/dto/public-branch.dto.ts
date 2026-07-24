import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicBranchDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiProperty()
  isActive: boolean;
}
