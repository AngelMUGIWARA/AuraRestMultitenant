import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@maison/api-client';

vi.mock('@maison/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { reservationsService } from '../../services/reservations.service';
import { branchesService } from '../../services/branches.service';

beforeEach(() => vi.clearAllMocks());

describe('reservationsService', () => {
  const mockGet = vi.mocked(apiClient.get);
  const mockPost = vi.mocked(apiClient.post);
  const mockPatch = vi.mocked(apiClient.patch);

  it('getStats calls GET /admin/reservations/stats', async () => {
    mockGet.mockResolvedValueOnce({ data: { totalToday: 10 } });
    await reservationsService.getStats('branch-1');
    expect(mockGet).toHaveBeenCalledWith('/admin/reservations/stats', { params: { branchId: 'branch-1' } });
  });

  it('getStats without branchId', async () => {
    mockGet.mockResolvedValueOnce({ data: {} });
    await reservationsService.getStats();
    expect(mockGet).toHaveBeenCalledWith('/admin/reservations/stats', { params: { branchId: undefined } });
  });

  it('getAll calls GET /admin/reservations with filters', async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });
    await reservationsService.getAll({ page: 1, limit: 20, status: 'pending' });
    expect(mockGet).toHaveBeenCalledWith('/admin/reservations', { params: { page: 1, limit: 20, status: 'pending' } });
  });

  it('getById calls GET /admin/reservations/:id', async () => {
    mockGet.mockResolvedValueOnce({ data: { id: 'r-1' } });
    await reservationsService.getById('r-1');
    expect(mockGet).toHaveBeenCalledWith('/admin/reservations/r-1');
  });

  it('create calls POST /admin/reservations', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 'r-1' } } as never);
    const payload = { guestName: 'Juan', guestPhone: '5512345678', partySize: 4, date: '2024-06-15', time: '19:00' } as any;
    await reservationsService.create(payload);
    expect(mockPost).toHaveBeenCalledWith('/admin/reservations', payload);
  });

  it('confirm calls PATCH /admin/reservations/:id/confirm', async () => {
    mockPatch.mockResolvedValueOnce({} as never);
    await reservationsService.confirm('r-1');
    expect(mockPatch).toHaveBeenCalledWith('/admin/reservations/r-1/confirm', {});
  });

  it('cancel calls PATCH with reason', async () => {
    mockPatch.mockResolvedValueOnce({} as never);
    await reservationsService.cancel('r-1', 'Cambio de planes');
    expect(mockPatch).toHaveBeenCalledWith('/admin/reservations/r-1/cancel', { reason: 'Cambio de planes' });
  });

  it('cancel without reason', async () => {
    mockPatch.mockResolvedValueOnce({} as never);
    await reservationsService.cancel('r-1');
    expect(mockPatch).toHaveBeenCalledWith('/admin/reservations/r-1/cancel', { reason: undefined });
  });

  it('arrived calls PATCH /admin/reservations/:id/arrived', async () => {
    mockPatch.mockResolvedValueOnce({} as never);
    await reservationsService.arrived('r-1');
    expect(mockPatch).toHaveBeenCalledWith('/admin/reservations/r-1/arrived', {});
  });

  it('updateStatus calls PATCH /admin/reservations/:id/status', async () => {
    mockPatch.mockResolvedValueOnce({} as never);
    await reservationsService.updateStatus('r-1', 'CONFIRMED');
    expect(mockPatch).toHaveBeenCalledWith('/admin/reservations/r-1/status', { status: 'CONFIRMED' });
  });
});

describe('branchesService', () => {
  const mockGet = vi.mocked(apiClient.get);

  beforeEach(() => vi.clearAllMocks());

  it('getAll calls GET /admin/branches', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: 'b-1', name: 'Sucursal 1' }], total: 1 });
    const result = await branchesService.getAll();
    expect(mockGet).toHaveBeenCalledWith('/admin/branches');
    expect(result.data).toHaveLength(1);
  });
});
