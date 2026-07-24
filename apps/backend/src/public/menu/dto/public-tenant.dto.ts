import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicTenantDto {
  @ApiProperty()
  slug: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  logoUrl?: string | null;
}
