import { BadRequestException, BadGatewayException } from '@nestjs/common';
import { TaxConfigService, DEFAULT_TAX_RATE } from './tax-config.service';

describe('TaxConfigService', () => {
  let service: TaxConfigService;
  let mockTenantPrisma: { getClient: jest.Mock };
  let mockSettings: { findUnique: jest.Mock };

  beforeEach(() => {
    mockSettings = { findUnique: jest.fn() };
    mockTenantPrisma = {
      getClient: jest.fn(() => ({ settings: mockSettings })),
    };
    service = new TaxConfigService(mockTenantPrisma as any);
  });

  describe('getTaxRate', () => {
    it('should return default tax rate when no branchId is provided (Scenario A)', async () => {
      const rate = await service.getTaxRate('tenant_schema');
      expect(rate).toBe(DEFAULT_TAX_RATE);
      expect(mockTenantPrisma.getClient).not.toHaveBeenCalled();
    });

    it('should return default tax rate when Settings record is not found (Scenario A)', async () => {
      mockSettings.findUnique.mockResolvedValue(null);
      const rate = await service.getTaxRate('tenant_schema', 'branch-001');
      expect(rate).toBe(DEFAULT_TAX_RATE);
      expect(mockSettings.findUnique).toHaveBeenCalledWith({
        where: { branchId_key: { branchId: 'branch-001', key: 'tax_rate' } },
      });
    });

    it('should return configured tax rate from Settings (Scenario B)', async () => {
      mockSettings.findUnique.mockResolvedValue({ value: '0.16' });
      const rate = await service.getTaxRate('tenant_schema', 'branch-001');
      expect(rate).toBe(0.16);
    });

    it('should return 0 tax rate if explicitly configured as 0 (Scenario B)', async () => {
      mockSettings.findUnique.mockResolvedValue({ value: '0' });
      const rate = await service.getTaxRate('tenant_schema', 'branch-001');
      expect(rate).toBe(0);
    });

    it('should accept boundary value 0.99 as valid (Scenario B)', async () => {
      mockSettings.findUnique.mockResolvedValue({ value: '0.99' });
      const rate = await service.getTaxRate('tenant_schema', 'branch-001');
      expect(rate).toBe(0.99);
    });

    it('should throw BadRequestException for non-numeric values (Scenario C)', async () => {
      mockSettings.findUnique.mockResolvedValue({ value: 'invalid' });
      await expect(
        service.getTaxRate('tenant_schema', 'branch-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative values (Scenario C)', async () => {
      mockSettings.findUnique.mockResolvedValue({ value: '-0.10' });
      await expect(
        service.getTaxRate('tenant_schema', 'branch-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for values >= 1 (Scenario C)', async () => {
      mockSettings.findUnique.mockResolvedValue({ value: '1.16' });
      await expect(
        service.getTaxRate('tenant_schema', 'branch-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for value "16" (percentage format, Scenario C)', async () => {
      mockSettings.findUnique.mockResolvedValue({ value: '16' });
      await expect(
        service.getTaxRate('tenant_schema', 'branch-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadGatewayException on database error (Scenario D)', async () => {
      mockSettings.findUnique.mockRejectedValue(new Error('DB connection failed'));
      await expect(
        service.getTaxRate('tenant_schema', 'branch-001'),
      ).rejects.toThrow(BadGatewayException);
    });

    it('should use correct tenant schema client', async () => {
      mockSettings.findUnique.mockResolvedValue(null);
      await service.getTaxRate('my_restaurant', 'branch-002');
      expect(mockTenantPrisma.getClient).toHaveBeenCalledWith('my_restaurant');
    });
  });
});
