import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PublicMenuService } from './public-menu.service';
import { PublicMenuRepository } from './public-menu.repository';

describe('PublicMenuService', () => {
  let service: PublicMenuService;
  let repository: PublicMenuRepository;

  const mockTenant = {
    id: 'tenant-1',
    slug: 'restaurant-1',
    name: 'Restaurant 1',
    schemaName: 'tenant_1',
    status: 'ACTIVE',
    logoUrl: null,
  };

  const mockInactiveTenant = {
    ...mockTenant,
    slug: 'restaurant-inactive',
    status: 'INACTIVE',
  };

  const mockBranch = {
    id: 'branch-1',
    name: 'Main Branch',
    slug: 'main',
    address: '123 Main St',
    phone: '555-1234',
    isActive: true,
  };

  const mockInactiveBranch = {
    ...mockBranch,
    slug: 'closed',
    isActive: false,
  };

  const mockCategory = {
    id: 'cat-1',
    name: 'Appetizers',
    description: 'Starters',
    imageUrl: null,
    sortOrder: 1,
  };

  const mockMenuItems = [
    {
      id: 'item-1',
      name: 'Wings',
      description: 'Buffalo wings',
      price: 10.99,
      imageUrl: null,
      isAvailable: true,
      status: 'AVAILABLE',
      categoryId: 'cat-1',
    },
  ];

  const mockInactiveMenuItem = {
    id: 'item-2',
    name: 'Out of Stock Item',
    description: null,
    price: 15.00,
    imageUrl: null,
    isAvailable: false,
    status: 'UNAVAILABLE',
    categoryId: 'cat-1',
  };

  const mockRepository = {
    getTenant: jest.fn(),
    getBranch: jest.fn(),
    getCategoriesWithItems: jest.fn(),
    getLastUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicMenuService,
        {
          provide: PublicMenuRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PublicMenuService>(PublicMenuService);
    repository = module.get<PublicMenuRepository>(PublicMenuRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMenuByTenantAndBranch', () => {
    it('should throw BadRequestException if tenantSlug is missing', async () => {
      await expect(
        service.getMenuByTenantAndBranch('', 'branch-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if tenant does not exist', async () => {
      mockRepository.getTenant.mockResolvedValueOnce(null);

      await expect(
        service.getMenuByTenantAndBranch('invalid', 'branch-1'),
      ).rejects.toThrow('Tenant no encontrado');
    });

    it('should throw NotFoundException if tenant is inactive', async () => {
      mockRepository.getTenant.mockResolvedValueOnce(mockInactiveTenant);

      await expect(
        service.getMenuByTenantAndBranch('restaurant-inactive', 'branch-1'),
      ).rejects.toThrow('Tenant no disponible');
    });

    it('should throw NotFoundException if branch does not exist', async () => {
      mockRepository.getTenant.mockResolvedValueOnce(mockTenant);
      mockRepository.getBranch.mockResolvedValueOnce(null);

      await expect(
        service.getMenuByTenantAndBranch('restaurant-1', 'invalid'),
      ).rejects.toThrow('Sucursal no encontrada');
    });

    it('should throw NotFoundException if branch is inactive', async () => {
      mockRepository.getTenant.mockResolvedValueOnce(mockTenant);
      mockRepository.getBranch.mockResolvedValueOnce(mockInactiveBranch);

      await expect(
        service.getMenuByTenantAndBranch('restaurant-1', 'closed'),
      ).rejects.toThrow('Sucursal no disponible');
    });

    it('should return public menu with categories and items', async () => {
      mockRepository.getTenant.mockResolvedValueOnce(mockTenant);
      mockRepository.getBranch.mockResolvedValueOnce(mockBranch);
      mockRepository.getCategoriesWithItems.mockResolvedValueOnce([
        { ...mockCategory, menuItems: mockMenuItems },
      ]);
      mockRepository.getLastUpdate.mockResolvedValueOnce(new Date('2024-01-01'));

      const result = await service.getMenuByTenantAndBranch('restaurant-1', 'main');

      expect(result.tenant.slug).toBe('restaurant-1');
      expect(result.tenant.name).toBe('Restaurant 1');
      expect(result.branch.id).toBe('branch-1');
      expect(result.branch.slug).toBe('main');
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].items).toHaveLength(1);
      expect(result.categories[0].items[0].name).toBe('Wings');
      expect(result.categories[0].items[0].price).toBe(10.99);
    });

    it('should filter out categories with no items', async () => {
      mockRepository.getTenant.mockResolvedValueOnce(mockTenant);
      mockRepository.getBranch.mockResolvedValueOnce(mockBranch);
      mockRepository.getCategoriesWithItems.mockResolvedValueOnce([
        { ...mockCategory, menuItems: [] },
      ]);
      mockRepository.getLastUpdate.mockResolvedValueOnce(new Date('2024-01-01'));

      const result = await service.getMenuByTenantAndBranch('restaurant-1', 'main');

      expect(result.categories).toHaveLength(0);
    });

    it('should use default branch if not specified', async () => {
      mockRepository.getTenant.mockResolvedValueOnce(mockTenant);
      mockRepository.getBranch.mockResolvedValueOnce(mockBranch);
      mockRepository.getCategoriesWithItems.mockResolvedValueOnce([]);
      mockRepository.getLastUpdate.mockResolvedValueOnce(new Date());

      await service.getMenuByTenantAndBranch('restaurant-1');

      expect(mockRepository.getBranch).toHaveBeenCalledWith(
        'tenant_1',
        'default',
      );
    });

    it('should return updatedAt as ISO string', async () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      mockRepository.getTenant.mockResolvedValueOnce(mockTenant);
      mockRepository.getBranch.mockResolvedValueOnce(mockBranch);
      mockRepository.getCategoriesWithItems.mockResolvedValueOnce([
        { ...mockCategory, menuItems: mockMenuItems },
      ]);
      mockRepository.getLastUpdate.mockResolvedValueOnce(testDate);

      const result = await service.getMenuByTenantAndBranch('restaurant-1', 'main');

      expect(result.updatedAt).toBe(testDate.toISOString());
    });

    it('should handle multiple categories, filtering empty ones', async () => {
      const mockCat1 = { ...mockCategory, id: 'cat-1' };
      const mockCat2 = { ...mockCategory, id: 'cat-2', name: 'Mains' };
      const mockCat3 = { ...mockCategory, id: 'cat-3', name: 'Desserts' };

      mockRepository.getTenant.mockResolvedValueOnce(mockTenant);
      mockRepository.getBranch.mockResolvedValueOnce(mockBranch);
      mockRepository.getCategoriesWithItems.mockResolvedValueOnce([
        { ...mockCat1, menuItems: mockMenuItems },
        { ...mockCat2, menuItems: [] },
        { ...mockCat3, menuItems: mockMenuItems },
      ]);
      mockRepository.getLastUpdate.mockResolvedValueOnce(new Date());

      const result = await service.getMenuByTenantAndBranch('restaurant-1', 'main');

      expect(result.categories).toHaveLength(2);
      expect(result.categories[0].id).toBe('cat-1');
      expect(result.categories[1].id).toBe('cat-3');
    });
  });
});
