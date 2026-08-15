import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { navigateTo, emit } from '@maison/event-bus';
import CreateOrderPage from '../pages/CreateOrderPage';

vi.mock('@maison/event-bus', () => ({
  navigateTo: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(() => vi.fn()),
}));

vi.mock('@maison/ui', () => ({
  useBranch: () => ({
    selectedBranch: { id: 'branch-1', name: 'Test Branch', isGlobal: false },
  }),
  BranchProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockCreateOrder = vi.fn();
vi.mock('../services/orders.service', () => ({
  ordersService: {
    getMenuItems: vi.fn().mockResolvedValue([
      { id: 'item-1', name: 'Tacos', price: 80, category: { name: 'Comida' } },
    ]),
    getTable: vi.fn().mockResolvedValue({ id: 'table-1', name: 'Mesa 1', capacity: 4 }),
    createOrder: (...args: unknown[]) => mockCreateOrder(...args),
  },
}));

function renderPage(tableId?: string) {
  const entries = tableId ? [`/orders/new?tableId=${tableId}`] : ['/orders/new'];
  return render(
    <MemoryRouter initialEntries={entries}>
      <CreateOrderPage />
    </MemoryRouter>,
  );
}

describe('CreateOrderPage — navegación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('botón volver emite navigateTo a /waiter/tables (push)', async () => {
    const user = userEvent.setup();
    renderPage();

    const backBtn = screen.getByLabelText('Volver');
    await user.click(backBtn);

    expect(navigateTo).toHaveBeenCalledOnce();
    expect(navigateTo).toHaveBeenCalledWith('/waiter/tables');
  });

  it('creación exitosa emite una sola navegación (replace)', async () => {
    mockCreateOrder.mockResolvedValueOnce({
      id: 'order-1',
      orderNumber: 1,
      total: 160,
      paymentStatus: 'pending',
    });

    const user = userEvent.setup();
    renderPage('table-1');

    await waitFor(() => {
      expect(screen.getByText('Tacos')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Tacos'));
    await user.click(screen.getByText('Enviar a Cocina'));

    await waitFor(() => {
      expect(navigateTo).toHaveBeenCalledOnce();
      expect(navigateTo).toHaveBeenCalledWith('/waiter/tables', true);
    });
  });

  it('creación fallida NO navega', async () => {
    mockCreateOrder.mockRejectedValueOnce(new Error('Network error'));

    const user = userEvent.setup();
    renderPage('table-1');

    await waitFor(() => {
      expect(screen.getByText('Tacos')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Tacos'));
    await user.click(screen.getByText('Enviar a Cocina'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    expect(navigateTo).not.toHaveBeenCalled();
  });

  it('no existe doble navegación post-creación', async () => {
    mockCreateOrder.mockResolvedValueOnce({
      id: 'order-2',
      orderNumber: 2,
      total: 80,
      paymentStatus: 'pending',
    });

    const user = userEvent.setup();
    renderPage('table-1');

    await waitFor(() => {
      expect(screen.getByText('Tacos')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Tacos'));
    await user.click(screen.getByText('Enviar a Cocina'));

    await waitFor(() => {
      expect(navigateTo).toHaveBeenCalled();
    });

    const navigateCalls = (navigateTo as ReturnType<typeof vi.fn>).mock.calls;
    expect(navigateCalls).toHaveLength(1);
    expect(navigateCalls[0][0]).toBe('/waiter/tables');
  });

  it('volver no ejecuta navegación doble', async () => {
    const user = userEvent.setup();
    renderPage();

    const backBtn = screen.getByLabelText('Volver');
    await user.click(backBtn);
    await user.click(backBtn);

    expect(navigateTo).toHaveBeenCalledTimes(2);
    expect(navigateTo).toHaveBeenCalledWith('/waiter/tables');
  });
});
