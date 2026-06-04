import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

export default function AuthApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/login"           element={<LoginPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="*"                     element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
