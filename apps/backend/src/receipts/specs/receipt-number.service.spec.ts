import { ReceiptNumberService } from '../receipt-number.service';

describe('ReceiptNumberService', () => {
  let service: ReceiptNumberService;

  beforeEach(() => {
    service = new ReceiptNumberService();
  });

  describe('formatFolio', () => {
    it('should format folio with 6-digit padding', () => {
      expect(service.formatFolio(1)).toBe('TKT-000001');
    });

    it('should format folio with larger numbers', () => {
      expect(service.formatFolio(42)).toBe('TKT-000042');
    });

    it('should format folio with 6-digit number', () => {
      expect(service.formatFolio(123456)).toBe('TKT-123456');
    });

    it('should format folio with zero', () => {
      expect(service.formatFolio(0)).toBe('TKT-000000');
    });
  });

  describe('reserveFolio', () => {
    it('should call upsert with correct parameters', async () => {
      const mockTx = {
        receiptSequence: {
          upsert: jest.fn().mockResolvedValue({ id: 'receipt_folio', value: 1 }),
        },
      };

      const folio = await service.reserveFolio('tenant', mockTx as any);

      expect(mockTx.receiptSequence.upsert).toHaveBeenCalledWith({
        where: { id: 'receipt_folio' },
        create: { id: 'receipt_folio', value: 1 },
        update: { value: { increment: 1 } },
      });
      expect(folio).toBe('TKT-000001');
    });

    it('should return correct folio for sequence value 5', async () => {
      const mockTx = {
        receiptSequence: {
          upsert: jest.fn().mockResolvedValue({ id: 'receipt_folio', value: 5 }),
        },
      };

      const folio = await service.reserveFolio('tenant', mockTx as any);
      expect(folio).toBe('TKT-000005');
    });

    it('should return correct folio for sequence value 100', async () => {
      const mockTx = {
        receiptSequence: {
          upsert: jest.fn().mockResolvedValue({ id: 'receipt_folio', value: 100 }),
        },
      };

      const folio = await service.reserveFolio('tenant', mockTx as any);
      expect(folio).toBe('TKT-000100');
    });
  });
});
