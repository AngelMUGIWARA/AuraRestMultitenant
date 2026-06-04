'use client';

import { init } from '@module-federation/runtime';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

let initialized = false;

// Bridge: @module-federation/vite stores shared modules in a different cache
// than @module-federation/runtime. Without this, MFEs get two React instances
// → hooks crash with "dispatcher null".
function bridgeSharedModules() {
  const mfCache = ((globalThis as any).__mf_module_cache__ ??= { share: {}, remote: {} });
  mfCache.share ??= {};
  if (!mfCache.share.react) mfCache.share.react = React;
  if (!mfCache.share['react-dom']) mfCache.share['react-dom'] = ReactDOM;
}

export const MFE_URLS = {
  auth:         process.env.NEXT_PUBLIC_MFE_AUTH_URL         ?? 'http://localhost:5001/remoteEntry.js',
  dashboard:    process.env.NEXT_PUBLIC_MFE_DASHBOARD_URL    ?? 'http://localhost:5002/remoteEntry.js',
  menu:         process.env.NEXT_PUBLIC_MFE_MENU_URL         ?? 'http://localhost:5003/remoteEntry.js',
  orders:       process.env.NEXT_PUBLIC_MFE_ORDERS_URL       ?? 'http://localhost:5004/remoteEntry.js',
  kitchen:      process.env.NEXT_PUBLIC_MFE_KITCHEN_URL      ?? 'http://localhost:5005/remoteEntry.js',
  cashier:      process.env.NEXT_PUBLIC_MFE_CASHIER_URL      ?? 'http://localhost:5006/remoteEntry.js',
  reports:      process.env.NEXT_PUBLIC_MFE_REPORTS_URL      ?? 'http://localhost:5007/remoteEntry.js',
  reservations: process.env.NEXT_PUBLIC_MFE_RESERVATIONS_URL ?? 'http://localhost:5008/remoteEntry.js',
} as const;

export function initFederation(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  bridgeSharedModules();

  init({
    name: 'web_shell',
    remotes: [
      { name: 'auth_mf',         entry: MFE_URLS.auth,         type: 'module' },
      { name: 'dashboard_mf',    entry: MFE_URLS.dashboard,    type: 'module' },
      { name: 'menu_mf',         entry: MFE_URLS.menu,         type: 'module' },
      { name: 'orders_mf',       entry: MFE_URLS.orders,       type: 'module' },
      { name: 'kitchen_mf',      entry: MFE_URLS.kitchen,      type: 'module' },
      { name: 'cashier_mf',      entry: MFE_URLS.cashier,      type: 'module' },
      { name: 'reports_mf',      entry: MFE_URLS.reports,      type: 'module' },
      { name: 'reservations_mf', entry: MFE_URLS.reservations, type: 'module' },
    ],
    shared: {
      react: {
        version: '19.2.4',
        scope: 'default',
        lib: () => React,
        shareConfig: { singleton: true, requiredVersion: '^19' },
      },
      'react-dom': {
        version: '19.2.4',
        scope: 'default',
        lib: () => ReactDOM,
        shareConfig: { singleton: true, requiredVersion: '^19' },
      },
    },
  });
}
