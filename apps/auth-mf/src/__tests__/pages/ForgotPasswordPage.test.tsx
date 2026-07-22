import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordPage from '../../pages/ForgotPasswordPage';
import { authService } from '../../services/auth.service';

vi.mock('../../services/auth.service', () => ({
  authService: {
    forgotPassword: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

const mockForgotPassword = vi.mocked(authService.forgotPassword);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ForgotPasswordPage', () => {
  describe('initial state (form visible)', () => {
    it('renders Maison brand heading', () => {
      render(<ForgotPasswordPage />);
      expect(screen.getByText('Maison')).toBeInTheDocument();
    });

    it('renders "Recuperar contraseña" heading', () => {
      render(<ForgotPasswordPage />);
      expect(screen.getByText('Recuperar contraseña')).toBeInTheDocument();
    });

    it('renders description text', () => {
      render(<ForgotPasswordPage />);
      expect(
        screen.getByText(/Ingresa tu correo y te enviaremos un enlace/),
      ).toBeInTheDocument();
    });

    it('renders email input', () => {
      render(<ForgotPasswordPage />);
      expect(screen.getByPlaceholderText('nombre@restaurante.com')).toBeInTheDocument();
    });

    it('renders "Enviar enlace" submit button', () => {
      render(<ForgotPasswordPage />);
      expect(screen.getByRole('button', { name: /enviar enlace/i })).toBeInTheDocument();
    });

    it('renders back link to /auth/login', () => {
      render(<ForgotPasswordPage />);
      const backLink = screen.getByText('← Volver al inicio de sesión');
      expect(backLink).toHaveAttribute('href', '/auth/login');
    });
  });

  describe('form submission', () => {
    it('calls authService.forgotPassword with the entered email', async () => {
      mockForgotPassword.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      await user.type(screen.getByPlaceholderText('nombre@restaurante.com'), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

      expect(mockForgotPassword).toHaveBeenCalledOnce();
      expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com');
    });

    it('shows success state after successful submission', async () => {
      mockForgotPassword.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      await user.type(screen.getByPlaceholderText('nombre@restaurante.com'), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

      await waitFor(() => {
        expect(screen.getByText('Correo enviado')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Revisa tu bandeja de entrada/),
      ).toBeInTheDocument();
    });

    it('shows "Volver al inicio de sesión" link after success', async () => {
      mockForgotPassword.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      await user.type(screen.getByPlaceholderText('nombre@restaurante.com'), 'u@b.com');
      await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

      await waitFor(() => {
        expect(screen.getByText('Volver al inicio de sesión')).toHaveAttribute(
          'href',
          '/auth/login',
        );
      });
    });

    it('hides the form after success (email input no longer visible)', async () => {
      mockForgotPassword.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      await user.type(screen.getByPlaceholderText('nombre@restaurante.com'), 'u@b.com');
      await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('nombre@restaurante.com')).not.toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('shows error message when Error is thrown', async () => {
      mockForgotPassword.mockRejectedValueOnce(new Error('Correo no encontrado'));
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      await user.type(screen.getByPlaceholderText('nombre@restaurante.com'), 'bad@example.com');
      await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

      await waitFor(() => {
        expect(screen.getByText('Correo no encontrado')).toBeInTheDocument();
      });
    });

    it('shows fallback error message when non-Error is thrown', async () => {
      mockForgotPassword.mockRejectedValueOnce('unknown error');
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      await user.type(screen.getByPlaceholderText('nombre@restaurante.com'), 'bad@example.com');
      await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

      await waitFor(() => {
        expect(screen.getByText('Error al enviar el correo')).toBeInTheDocument();
      });
    });

    it('keeps form visible after error', async () => {
      mockForgotPassword.mockRejectedValueOnce(new Error('fail'));
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      await user.type(screen.getByPlaceholderText('nombre@restaurante.com'), 'a@b.com');
      await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

      await waitFor(() => {
        expect(screen.getByText('fail')).toBeInTheDocument();
      });
      expect(screen.getByText('Recuperar contraseña')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('nombre@restaurante.com')).toBeInTheDocument();
    });

    it('clears error on next submission attempt', async () => {
      mockForgotPassword
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      await user.type(screen.getByPlaceholderText('nombre@restaurante.com'), 'a@b.com');
      await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
      });
    });

    it('re-enables button after error (isLoading goes back to false)', async () => {
      mockForgotPassword.mockRejectedValueOnce(new Error('fail'));
      const user = userEvent.setup();
      render(<ForgotPasswordPage />);

      await user.type(screen.getByPlaceholderText('nombre@restaurante.com'), 'a@b.com');
      await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /enviar enlace/i })).not.toBeDisabled();
      });
    });
  });
});
