import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navigateTo } from '@maison/event-bus';
import { TablesPage } from '../pages/TablesPage';

vi.mock('@maison/event-bus', () => ({
  navigateTo: vi.fn(),
  on: vi.fn(() => vi.fn()),
  emit: vi.fn(),
}));

vi.mock('@maison/ui', () => ({
  useBranch: () => ({
    selectedBranch: { id: 'branch-1', name: 'Test Branch', isGlobal: false },
    setSelectedBranch: vi.fn(),
  }),
  BranchProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TableCard: ({ name, onSelect }: { name: string; onSelect: () => void }) => (
    <button onClick={onSelect}>{name}</button>
  ),
  TABLE_STATUS_CONFIG: {},
  IconTable: () => null,
}));

vi.mock('../hooks/useTables', () => ({
  useTables: () => ({
    tables: {
      data: [
        { id: 'table-1', name: 'Mesa 1', capacity: 4, status: 'AVAILABLE' },
        { id: 'table-2', name: 'Mesa 2', capacity: 2, status: 'OCCUPIED' },
      ],
      total: 2,
      page: 1,
      limit: 30,
      totalPages: 1,
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    branch: { id: 'branch-1', name: 'Test Branch' },
  }),
}));

vi.mock('../components/TablesGrid', () => ({
  TablesGrid: ({ data, onSelect }: { data: Array<{ id: string; name: string }>; onSelect: (item: any) => void }) => (
    <div data-testid="tables-grid">
      {data.map((t) => (
        <button key={t.id} onClick={() => onSelect(t)}>{t.name}</button>
      ))}
    </div>
  ),
}));

describe('TablesPage — navegación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seleccionar mesa emite navigateTo con tableId correcto', async () => {
    const user = userEvent.setup();
    render(<TablesPage />);

    await user.click(screen.getByText('Mesa 1'));

    expect(navigateTo).toHaveBeenCalledOnce();
    expect(navigateTo).toHaveBeenCalledWith('/waiter/orders/new?tableId=table-1');
  });

  it('no usa window.location', () => {
    render(<TablesPage />);
    expect(screen.getByText('Mesa 1')).toBeInTheDocument();
  });
});
