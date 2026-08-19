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

// Fix for: "@vitejs/plugin-react can't detect preamble. Something is wrong."
//
// When a Vite MFE runs in dev mode, @vitejs/plugin-react injects React Refresh
// (HMR) code that requires window.__vite_plugin_react_preamble_installed__ = true
// and the $Refresh* globals. Normally Vite sets these in the MFE's own index.html,
// but when the MFE is loaded as a remote by a different host (Next.js), that
// index.html is never evaluated in the shell's window.
//
// Solution: set the preamble globals on the shell's window so the MFE's HMR code
// finds them. Real React Refresh will still work per-MFE because each Vite dev
// server maintains its own HMR websocket; these globals are just the handshake.
function installViteReactPreamble() {
  const w = window as any;
  if (w.__vite_plugin_react_preamble_installed__) return;
  w.__vite_plugin_react_preamble_installed__ = true;
  w.$RefreshReg$ ??= () => {};
  w.$RefreshSig$ ??= () => (type: unknown) => type;
}

// ✅ OPTIMIZACIÓN: URLs consolidadas, solo las que existen
export const MFE_URLS = {
  core_auth_dashboard:   process.env.NEXT_PUBLIC_MFE_CORE_AUTH_DASHBOARD_URL ?? 'http://localhost:5011/remoteEntry.js',
  orders_tables:         process.env.NEXT_PUBLIC_MFE_ORDERS_TABLES_URL ?? 'http://localhost:5012/remoteEntry.js',
  reservations_reports:  process.env.NEXT_PUBLIC_MFE_RESERVATIONS_REPORTS_URL ?? 'http://localhost:5013/remoteEntry.js',
  kitchen_mf:            process.env.NEXT_PUBLIC_MFE_KITCHEN_URL ?? 'http://localhost:5005/remoteEntry.js',
  cashier_mf:            process.env.NEXT_PUBLIC_MFE_CASHIER_URL ?? 'http://localhost:5006/remoteEntry.js',
  menu_mf:               process.env.NEXT_PUBLIC_MFE_MENU_URL ?? 'http://localhost:5003/remoteEntry.js',
} as const;

const MFE_URL_BY_REMOTE = {
  core_auth_dashboard_mf: MFE_URLS.core_auth_dashboard,
  orders_tables_mf: MFE_URLS.orders_tables,
  reservations_reports_mf: MFE_URLS.reservations_reports,
  kitchen_mf: MFE_URLS.kitchen_mf,
  cashier_mf: MFE_URLS.cashier_mf,
  menu_mf: MFE_URLS.menu_mf,
} as const;

export function getMFEUrl(remoteName: string): string | undefined {
  return MFE_URL_BY_REMOTE[remoteName as keyof typeof MFE_URL_BY_REMOTE];
}

export function initFederation(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  installViteReactPreamble();
  bridgeSharedModules();

  init({
    name: 'web_shell',
    remotes: [
      { name: 'core_auth_dashboard_mf', entry: MFE_URLS.core_auth_dashboard, type: 'module' },
      { name: 'orders_tables_mf', entry: MFE_URLS.orders_tables, type: 'module' },
      { name: 'reservations_reports_mf', entry: MFE_URLS.reservations_reports, type: 'module' },

      { name: 'kitchen_mf', entry: MFE_URLS.kitchen_mf, type: 'module' },
      { name: 'cashier_mf', entry: MFE_URLS.cashier_mf, type: 'module' },
      { name: 'menu_mf', entry: MFE_URLS.menu_mf, type: 'module' },

      { name: 'menu_mf', entry: MFE_URLS.menu_mf, type: 'module' },
      { name: 'kitchen_mf', entry: MFE_URLS.kitchen_mf, type: 'module' },
      { name: 'cashier_mf', entry: MFE_URLS.cashier_mf, type: 'module' },

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
      'react/jsx-runtime': { shareConfig: { singleton: true, requiredVersion: '^19' } },
      'react-router-dom': { shareConfig: { singleton: true, requiredVersion: '^7' } },
      '@maison/ui': { shareConfig: { singleton: true, requiredVersion: '*' } },
      '@maison/api-client': { shareConfig: { singleton: true, requiredVersion: '*' } },
      '@maison/types': { shareConfig: { singleton: true, requiredVersion: '*' } },
      '@maison/event-bus': { shareConfig: { singleton: true, requiredVersion: '*' } },
      '@maison/auth-client': { shareConfig: { singleton: true, requiredVersion: '*' } },
    },
  });
}
