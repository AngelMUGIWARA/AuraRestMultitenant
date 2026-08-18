import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../../pages/LoginPage';

const mockLogin = vi.fn();
vi.mock('../../hooks/useLogin', () => ({
  useLogin: () => ({
    login: mockLogin,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

const mockLocationReplace = vi.fn();
let originalLocation: Location;

beforeEach(() => {
  vi.clearAllMocks();
  originalLocation = window.location;
  const mockLocation = {
    ...originalLocation,
    replace: mockLocationReplace,
    href: originalLocation.href,
    pathname: originalLocation.pathname,
  };
  Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', {
    value: originalLocation,
    writable: true,
    configurable: true,
  });
});

describe('LoginPage', () => {
  describe('rendering', () => {
    it('renders the Maison brand heading', () => {
      render(<LoginPage />);
      expect(screen.getByText('Maison')).toBeInTheDocument();
    });

    it('renders "Iniciar sesión" heading', () => {
      render(<LoginPage />);
      expect(screen.getByText('Iniciar sesión')).toBeInTheDocument();
    });

    it('renders tenant slug input with placeholder', () => {
      render(<LoginPage />);
      expect(screen.getByPlaceholderText('mi-restaurante')).toBeInTheDocument();
    });

    it('renders email input', () => {
      render(<LoginPage />);
      expect(screen.getByPlaceholderText('nombre@restaurante.com')).toBeInTheDocument();
    });

    it('renders password input with password type by default', () => {
      render(<LoginPage />);
      const passwordInput = screen.getByPlaceholderText('••••••••');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('renders submit button with "Entrar" text', () => {
      render(<LoginPage />);
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    });

    it('renders forgot password link', () => {
      render(<LoginPage />);
      expect(screen.getByText('¿Olvidaste tu contraseña?')).toHaveAttribute(
        'href',
        '/auth/forgot-password',
      );
    });
  });

  describe('tenant slug normalization', () => {
    it('lowercases input and replaces spaces with hyphens', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);
      const tenantInput = screen.getByPlaceholderText('mi-restaurante');

      await user.type(tenantInput, 'Mi Restaurante');

      expect(tenantInput).toHaveValue('mi-restaurante');
    });
  });

  describe('password show/hide toggle', () => {
    it('starts with type=password', () => {
      render(<LoginPage />);
      expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password');
    });

    it('toggles to type=text when eye button is clicked', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const toggleButton = screen.getAllByRole('button').find(
        (b) => b.getAttribute('type') === 'button',
      )!;
      await user.click(toggleButton);

      expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'text');
    });

    it('toggles back to type=password on second click', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const toggleButton = screen.getAllByRole('button').find(
        (b) => b.getAttribute('type') === 'button',
      )!;
      await user.click(toggleButton);
      await user.click(toggleButton);

      expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password');
    });
  });

  describe('form submission', () => {
    it('calls login with form data and handleSuccess on submit', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      await user.type(screen.getByPlaceholderText('mi-restaurante'), 'demo');
      await user.type(screen.getByPlaceholderText('nombre@restaurante.com'), 'owner@demo.com');
      await user.type(screen.getByPlaceholderText('••••••••'), 'Owner123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      expect(mockLogin).toHaveBeenCalledOnce();
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'owner@demo.com',
          password: 'Owner123',
          tenantSlug: 'demo',
        }),
        expect.any(Function),
      );
    });
  });

  describe('role-based routing (handleSuccess)', () => {
    async function submitForm() {
      const user = userEvent.setup();
      render(<LoginPage />);
      await user.type(screen.getByPlaceholderText('mi-restaurante'), 'demo');
      await user.type(screen.getByPlaceholderText('nombre@restaurante.com'), 'a@b.com');
      await user.type(screen.getByPlaceholderText('••••••••'), 'pass');
      await user.click(screen.getByRole('button', { name: /entrar/i }));
      return mockLogin.mock.calls[0][1];
    }

    it('redirects OWNER to /dashboard', async () => {
      const handleSuccess = await submitForm();
      handleSuccess({ role: 'OWNER', id: '1', email: 'a@b.com', name: 'Owner' });
      expect(mockLocationReplace).toHaveBeenCalledWith('/dashboard');
    });

    it('redirects MANAGER to /manager-dashboard', async () => {
      const handleSuccess = await submitForm();
      handleSuccess({ role: 'MANAGER', id: '1', email: 'a@b.com', name: 'Mgr' });
      expect(mockLocationReplace).toHaveBeenCalledWith('/manager-dashboard');
    });

    it('redirects WAITER to /waiter/tables', async () => {
      const handleSuccess = await submitForm();
      handleSuccess({ role: 'WAITER', id: '1', email: 'a@b.com', name: 'Waiter' });
      expect(mockLocationReplace).toHaveBeenCalledWith('/waiter/tables');
    });

    it('redirects CASHIER to /cashier', async () => {
      const handleSuccess = await submitForm();
      handleSuccess({ role: 'CASHIER', id: '1', email: 'a@b.com', name: 'Cashier' });
      expect(mockLocationReplace).toHaveBeenCalledWith('/cashier');
    });

    it('redirects KITCHEN_STAFF to /chef/dashboard', async () => {
      const handleSuccess = await submitForm();
      handleSuccess({ role: 'KITCHEN_STAFF', id: '1', email: 'a@b.com', name: 'KS' });
      expect(mockLocationReplace).toHaveBeenCalledWith('/chef/dashboard');
    });

    it('redirects unknown role to /dashboard (fallback)', async () => {
      const handleSuccess = await submitForm();
      handleSuccess({ role: 'UNKNOWN_ROLE', id: '1', email: 'a@b.com', name: 'X' });
      expect(mockLocationReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('error display', () => {
    it('does NOT render error banner when no error', () => {
      render(<LoginPage />);
      expect(screen.queryByText(/credenciales/i)).not.toBeInTheDocument();
    });
  });
});
