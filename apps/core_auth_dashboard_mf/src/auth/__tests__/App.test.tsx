import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthApp from '../App';

vi.mock('../pages/LoginPage', () => ({
  default: () => <div data-testid="login-page">LoginPage</div>,
}));

vi.mock('../pages/ForgotPasswordPage', () => ({
  default: () => <div data-testid="forgot-password-page">ForgotPasswordPage</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthApp', () => {
  describe('routing based on window.location.pathname', () => {
    it('renders LoginPage for /auth/login', () => {
      window.history.pushState({}, '', '/auth/login');
      render(<AuthApp />);
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('forgot-password-page')).not.toBeInTheDocument();
    });

    it('renders ForgotPasswordPage for /auth/forgot-password', () => {
      window.history.pushState({}, '', '/auth/forgot-password');
      render(<AuthApp />);
      expect(screen.getByTestId('forgot-password-page')).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    it('renders LoginPage for root path /', () => {
      window.history.pushState({}, '', '/');
      render(<AuthApp />);
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('renders LoginPage for unknown paths', () => {
      window.history.pushState({}, '', '/some/random/path');
      render(<AuthApp />);
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('renders ForgotPasswordPage for nested paths starting with /auth/forgot-password', () => {
      window.history.pushState({}, '', '/auth/forgot-password?token=abc');
      render(<AuthApp />);
      expect(screen.getByTestId('forgot-password-page')).toBeInTheDocument();
    });

    it('renders LoginPage for /auth/reset-password', () => {
      window.history.pushState({}, '', '/auth/reset-password');
      render(<AuthApp />);
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });
});
