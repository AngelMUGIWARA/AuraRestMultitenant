import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Maison Admin', template: '%s · Maison' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
