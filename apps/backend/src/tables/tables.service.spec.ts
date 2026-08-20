import { NotFoundException } from '@nestjs/common';
import { TablesService } from './tables.service';

function makeTable(overrides: any = {}) {
  return {
    id: 'table-1',
    number: 5,
    name: 'Mesa 5',
    capacity: 4,
    status: 'AVAILABLE',
    locationZone: 'Terraza',
    isActive: true,
    branchId: 'branch-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    orders: [],
    ...overrides,
  };
}

describe('TablesService', () => {
  let service: TablesService;
  let repo: any;

  beforeEach(() => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findUserBranchIds: jest.fn(),
      updateStatus: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      hasHistory: jest.fn(),
      findByNumberAndBranch: jest.fn(),
    };
    service = new TablesService(repo);
  });

  describe('findAll — branch scope', () => {
    const tableBranch1 = makeTable({ id: 't-1', branchId: 'branch-1', number: 1 });
    const tableBranch2 = makeTable({ id: 't-2', branchId: 'branch-2', number: 2 });

    beforeEach(() => {
      repo.findAll.mockResolvedValue([tableBranch1, tableBranch2]);
    });

    it('OWNER sees all tables (no branch filter)', async () => {
      const user = { id: 'user-owner', role: 'OWNER' };
      const result = await service.findAll('schema-1', undefined, user);

      expect(repo.findAll).toHaveBeenCalledWith('schema-1', undefined);
      expect(result).toHaveLength(2);
    });

    it('OWNER with explicit branchId filters by that branch', async () => {
      repo.findAll.mockResolvedValue([tableBranch1]);
      const user = { id: 'user-owner', role: 'OWNER' };
      const result = await service.findAll('schema-1', 'branch-1', user);

      expect(repo.findAll).toHaveBeenCalledWith('schema-1', { branchId: 'branch-1' });
      expect(result).toHaveLength(1);
    });

    it('CASHIER with explicit branchId filters by that branch', async () => {
      repo.findAll.mockResolvedValue([tableBranch1]);
      const user = { id: 'user-cashier', role: 'CASHIER' };
      const result = await service.findAll('schema-1', 'branch-1', user);

      expect(repo.findAll).toHaveBeenCalledWith('schema-1', { branchId: 'branch-1' });
      expect(result).toHaveLength(1);
    });

    it('CASHIER without branchId gets only tables from assigned branches', async () => {
      repo.findUserBranchIds.mockResolvedValue(['branch-1']);
      repo.findAll.mockResolvedValue([tableBranch1]);

      const user = { id: 'user-cashier', role: 'CASHIER' };
      const result = await service.findAll('schema-1', undefined, user);

      expect(repo.findUserBranchIds).toHaveBeenCalledWith('schema-1', 'user-cashier');
      expect(repo.findAll).toHaveBeenCalledWith('schema-1', {
        branchId: { in: ['branch-1'] },
      });
      expect(result).toHaveLength(1);
    });

    it('CASHIER with multiple assigned branches sees tables from all of them', async () => {
      repo.findUserBranchIds.mockResolvedValue(['branch-1', 'branch-2']);
      repo.findAll.mockResolvedValue([tableBranch1, tableBranch2]);

      const user = { id: 'user-cashier', role: 'CASHIER' };
      const result = await service.findAll('schema-1', undefined, user);

      expect(repo.findAll).toHaveBeenCalledWith('schema-1', {
        branchId: { in: ['branch-1', 'branch-2'] },
      });
      expect(result).toHaveLength(2);
    });

    it('WAITER without branchId gets only tables from assigned branches', async () => {
      repo.findUserBranchIds.mockResolvedValue(['branch-2']);
      repo.findAll.mockResolvedValue([tableBranch2]);

      const user = { id: 'user-waiter', role: 'WAITER' };
      const result = await service.findAll('schema-1', undefined, user);

      expect(repo.findUserBranchIds).toHaveBeenCalledWith('schema-1', 'user-waiter');
      expect(repo.findAll).toHaveBeenCalledWith('schema-1', {
        branchId: { in: ['branch-2'] },
      });
      expect(result).toHaveLength(1);
    });

    it('MANAGER without branchId is scoped to their assigned branches', async () => {
      repo.findUserBranchIds.mockResolvedValue(['branch-1']);
      repo.findAll.mockResolvedValue([tableBranch1]);

      const user = { id: 'user-manager', role: 'MANAGER' };
      const result = await service.findAll('schema-1', undefined, user);

      expect(repo.findUserBranchIds).toHaveBeenCalledWith('schema-1', 'user-manager');
      expect(repo.findAll).toHaveBeenCalledWith('schema-1', {
        branchId: { in: ['branch-1'] },
      });
      expect(result).toHaveLength(1);
    });

    it('CASHIER with no UserBranch records gets 0 results (no global access)', async () => {
      repo.findUserBranchIds.mockResolvedValue([]);
      repo.findAll.mockResolvedValue([]);

      const user = { id: 'user-cashier', role: 'CASHIER' };
      const result = await service.findAll('schema-1', undefined, user);

      expect(repo.findUserBranchIds).toHaveBeenCalledWith('schema-1', 'user-cashier');
      expect(repo.findAll).toHaveBeenCalledWith('schema-1', { branchId: { in: [] } });
      expect(result).toHaveLength(0);
    });

    it('no user provided — no branch filter applied (backward compatibility)', async () => {
      const result = await service.findAll('schema-1', undefined, undefined);

      expect(repo.findAll).toHaveBeenCalledWith('schema-1', undefined);
      expect(result).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('should return table by id', async () => {
      const table = makeTable();
      repo.findById.mockResolvedValue(table);
      const result = await service.findById('schema-1', 'table-1');
      expect(result.id).toBe('table-1');
    });

    it('should throw NotFoundException if not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.findById('schema-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
