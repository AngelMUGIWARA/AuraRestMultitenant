import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PublicMenuRepository } from './public-menu.repository';
import {
  PublicMenuResponseDto,
  PublicCategoryDto,
  PublicMenuItemDto,
} from './dto';

@Injectable()
export class PublicMenuService {
  constructor(private readonly repo: PublicMenuRepository) {}

  async getMenuByTenantAndBranch(
    tenantSlug: string,
    branchIdentifier?: string,
  ): Promise<PublicMenuResponseDto> {
    if (!tenantSlug) {
      throw new BadRequestException('Tenant slug is required');
    }

    const tenant = await this.repo.getTenant(tenantSlug);
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Tenant no disponible');
    }

    const branch = branchIdentifier
      ? await this.repo.getBranch(tenant.schemaName, branchIdentifier)
      : await this.repo.getDefaultBranch(tenant.schemaName);

    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    if (!branch.isActive) {
      throw new NotFoundException('Sucursal no disponible');
    }

    const categories = await this.repo.getCategoriesWithItems(tenant.schemaName);

    const categoriesWithItems: PublicCategoryDto[] = categories
      .filter((cat) => cat.menuItems.length > 0)
      .map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        imageUrl: category.imageUrl,
        sortOrder: category.sortOrder,
        items: category.menuItems.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: Number(item.price),
          imageUrl: item.imageUrl,
          isAvailable: item.isAvailable,
          status: item.status,
          categoryId: item.categoryId,
        })),
      }));

    const updatedAt = await this.repo.getLastUpdate(tenant.schemaName);

    return {
      tenant: {
        slug: tenant.slug,
        name: tenant.name,
        logoUrl: tenant.logoUrl,
      },
      branch: {
        id: branch.id,
        name: branch.name,
        slug: branch.slug,
        address: branch.address,
        phone: branch.phone,
        isActive: branch.isActive,
      },
      categories: categoriesWithItems,
      updatedAt: updatedAt.toISOString(),
    };
  }
}
