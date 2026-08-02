import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

export default function AuthApp() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/auth/login';
  if (path.startsWith('/auth/forgot-password')) {
    return <ForgotPasswordPage />;
  }
  return <LoginPage />;
}
