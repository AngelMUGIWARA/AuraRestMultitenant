'use client';

import Link from 'next/link';
import { AuthClient } from '@maison/auth-client';
import { IconOrders, IconInventory, IconAnalytics } from '@maison/ui';

const QUICK_LINKS = [
  {
    href: '/chef/pedidos',
    label: 'Pedidos',
    description: 'Cola de comandas de cocina en tiempo real',
    icon: IconOrders,
  },
  {
    href: '/chef/inventario',
    label: 'Inventario',
    description: 'Existencias y disponibilidad de insumos',
    icon: IconInventory,
  },
  {
    href: '/chef/reportes',
    label: 'Reportes',
    description: 'Resumen de ventas y desempeño',
    icon: IconAnalytics,
  },
];

export default function ChefDashboardPage() {
  const email = AuthClient.getUser()?.email ?? '';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-maison-cream">Cocina</h1>
        <p className="text-sm text-maison-cream-dim">
          {email ? `Bienvenido, ${email}` : 'Bienvenido'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {QUICK_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="card flex flex-col gap-3 p-5 transition-colors hover:bg-surface-2">
              <Icon className="h-5 w-5 text-maison-amber" />
              <div>
                <p className="text-sm font-medium text-maison-cream">{item.label}</p>
                <p className="mt-1 text-xs text-maison-cream-dim">{item.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
