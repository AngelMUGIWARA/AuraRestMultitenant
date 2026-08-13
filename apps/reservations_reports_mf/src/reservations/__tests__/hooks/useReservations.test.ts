import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useReservations } from '../../hooks/useReservations';
import { reservationsService } from '../../services/reservations.service';

vi.mock('../../services/reservations.service', () => ({
  reservationsService: { getStats: vi.fn(), getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), confirm: vi.fn(), cancel: vi.fn(), arrived: vi.fn(), updateStatus: vi.fn() },
}));

const onMock = vi.fn(() => vi.fn());
vi.mock('@maison/event-bus', () => ({
  on: (...args: unknown[]) => onMock(...args),
  emit: vi.fn(),
}));

const mockGetStats = vi.mocked(reservationsService.getStats);
const mockGetAll = vi.mocked(reservationsService.getAll);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => vi.useRealTimers());

const mockStats = { totalToday: 10, confirmedToday: 5, pendingConfirmation: 3, completedToday: 2, cancelledToday: 0, arrivedToday: 1, occupancyRate: 75, averagePartySize: 3.5 };
const mockPaginated = { items: [{ id: 'r-1', guestName: 'Juan' }], total: 1, page: 1, limit: 20 };

describe('useReservations', () => {
  it('starts with isLoading=true', () => {
    mockGetStats.mockReturnValueOnce(new Promise(() => {}));
    mockGetAll.mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderHook(() => useReservations('branch-1'));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.stats).toBeNull();
    expect(result.current.reservations).toBeNull();
  });

  it('loads stats and reservations on mount', async () => {
    mockGetStats.mockResolvedValueOnce({ data: mockStats } as never);
    mockGetAll.mockResolvedValueOnce({ data: mockPaginated } as never);
    const { result } = renderHook(() => useReservations('branch-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.reservations).toEqual(mockPaginated);
  });

  it('sets error on failure', async () => {
    mockGetStats.mockRejectedValueOnce(new Error('API error'));
    mockGetAll.mockRejectedValueOnce(new Error('API error'));
    const { result } = renderHook(() => useReservations('branch-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe('API error');
  });

  it('sets generic error for non-Error throw', async () => {
    mockGetStats.mockRejectedValueOnce('string');
    mockGetAll.mockRejectedValueOnce('string');
    const { result } = renderHook(() => useReservations('branch-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.message).toBe('Error al cargar datos del servidor');
  });

  it('registers event-bus subscriptions', async () => {
    mockGetStats.mockResolvedValueOnce({ data: null } as never);
    mockGetAll.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, limit: 20 } } as never);
    renderHook(() => useReservations('branch-1'));
    await waitFor(() => expect(onMock).toHaveBeenCalled());
    const eventNames = onMock.mock.calls.map((c: unknown[]) => c[0]);
    expect(eventNames).toContain('reservation:created');
    expect(eventNames).toContain('reservation:cancelled');
    expect(eventNames).toContain('branch:changed');
  });

  it('setFilters resets page to 1', async () => {
    mockGetStats.mockResolvedValueOnce({ data: null } as never);
    mockGetAll.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, limit: 20 } } as never);
    const { result } = renderHook(() => useReservations('branch-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setFilters({ page: 5, status: 'confirmed' }));
    expect(result.current.filters.page).toBe(1);
    expect(result.current.filters.status).toBe('confirmed');
  });

  it('refresh increments tick and refetches', async () => {
    mockGetStats.mockResolvedValue({ data: mockStats } as never);
    mockGetAll.mockResolvedValue({ data: mockPaginated } as never);
    const { result } = renderHook(() => useReservations('branch-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callCount = mockGetAll.mock.calls.length;
    act(() => result.current.refresh());
    await waitFor(() => expect(mockGetAll.mock.calls.length).toBeGreaterThan(callCount));
  });

  it('normalizes global branchId to undefined', async () => {
    mockGetStats.mockResolvedValueOnce({ data: null } as never);
    mockGetAll.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, limit: 20 } } as never);
    renderHook(() => useReservations('global'));
    await waitFor(() => expect(mockGetStats).toHaveBeenCalledWith(undefined));
    await waitFor(() => expect(mockGetAll).toHaveBeenCalledWith(expect.objectContaining({ branchId: undefined })));
  });

  it('sets branchId filter on branch:changed event', async () => {
    mockGetStats.mockResolvedValue({ data: null } as never);
    mockGetAll.mockResolvedValue({ data: { items: [], total: 0, page: 1, limit: 20 } } as never);
    renderHook(() => useReservations('branch-1'));
    await waitFor(() => expect(onMock).toHaveBeenCalled());
    const branchHandler = onMock.mock.calls.find((c: unknown[]) => c[0] === 'branch:changed')?.[1] as Function;
    act(() => branchHandler({ branchId: 'branch-2', isGlobal: false }));
    await waitFor(() => {
      const lastCall = mockGetAll.mock.calls[mockGetAll.mock.calls.length - 1][0] as Record<string, unknown>;
      expect(lastCall.branchId).toBe('branch-2');
    });
  });
});
