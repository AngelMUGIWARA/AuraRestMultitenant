import { ApiProperty } from '@nestjs/swagger';
import { PublicTenantDto } from './public-tenant.dto';
import { PublicBranchDto } from './public-branch.dto';
import { PublicCategoryDto } from './public-category.dto';

export class PublicMenuResponseDto {
  @ApiProperty()
  tenant: PublicTenantDto;

  @ApiProperty()
  branch: PublicBranchDto;

  @ApiProperty({ type: [PublicCategoryDto] })
  categories: PublicCategoryDto[];

  @ApiProperty({ description: 'ISO timestamp de última actualización' })
  updatedAt: string;
}
