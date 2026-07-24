import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PublicMenuController } from './public-menu.controller';
import { PublicMenuService } from './public-menu.service';

describe('PublicMenuController', () => {
  let controller: PublicMenuController;
  let service: PublicMenuService;

  const mockResponse = {
    tenant: {
      slug: 'restaurant-1',
      name: 'Restaurant 1',
      logoUrl: null,
    },
    branch: {
      id: 'branch-1',
      name: 'Main Branch',
      slug: 'main',
      address: '123 Main St',
      phone: '555-1234',
      isActive: true,
    },
    categories: [
      {
        id: 'cat-1',
        name: 'Appetizers',
        description: null,
        imageUrl: null,
        sortOrder: 1,
        items: [
          {
            id: 'item-1',
            name: 'Wings',
            description: null,
            price: '10.99',
            imageUrl: null,
            isAvailable: true,
            status: 'AVAILABLE',
            categoryId: 'cat-1',
          },
        ],
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  const mockService = {
    getMenuByTenantAndBranch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicMenuController],
      providers: [
        {
          provide: PublicMenuService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<PublicMenuController>(PublicMenuController);
    service = module.get<PublicMenuService>(PublicMenuService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMenuByTenant', () => {
    it('should return menu when tenant and branch are valid', async () => {
      mockService.getMenuByTenantAndBranch.mockResolvedValueOnce(mockResponse);

      const result = await controller.getMenuByTenant('restaurant-1', {
        branch: 'main',
      });

      expect(result).toEqual(mockResponse);
      expect(mockService.getMenuByTenantAndBranch).toHaveBeenCalledWith(
        'restaurant-1',
        'main',
      );
    });

    it('should throw BadRequestException for empty tenantSlug', async () => {
      expect(() =>
        controller.getMenuByTenant('', { branch: 'main' }),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for whitespace-only tenantSlug', async () => {
      expect(() =>
        controller.getMenuByTenant('   ', { branch: 'main' }),
      ).toThrow(BadRequestException);
    });

    it('should handle missing branch parameter with undefined', async () => {
      mockService.getMenuByTenantAndBranch.mockResolvedValueOnce(mockResponse);

      await controller.getMenuByTenant('restaurant-1', {});

      expect(mockService.getMenuByTenantAndBranch).toHaveBeenCalledWith(
        'restaurant-1',
        undefined,
      );
    });

    it('should propagate service NotFoundException', async () => {
      mockService.getMenuByTenantAndBranch.mockRejectedValueOnce(
        new NotFoundException('Tenant not found'),
      );

      await expect(
        controller.getMenuByTenant('invalid', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
