import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acceso · Maison',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-0">
      {children}
    </main>
  );
}
