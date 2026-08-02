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

export const MFE_URLS = {
  // Remotos que se cargan al inicio (eager)
  core_auth_dashboard:   process.env.NEXT_PUBLIC_MFE_CORE_AUTH_DASHBOARD_URL ?? 'http://localhost:5011/remoteEntry.js',
  orders_tables:         process.env.NEXT_PUBLIC_MFE_ORDERS_TABLES_URL ?? 'http://localhost:5012/remoteEntry.js',
  reservations_reports:  process.env.NEXT_PUBLIC_MFE_RESERVATIONS_REPORTS_URL ?? 'http://localhost:5013/remoteEntry.js',

  // Remotos legacy (para backwards compatibility si se usan directamente)
  auth:         process.env.NEXT_PUBLIC_MFE_AUTH_URL         ?? 'http://localhost:5001/remoteEntry.js',
  dashboard:    process.env.NEXT_PUBLIC_MFE_DASHBOARD_URL    ?? 'http://localhost:5002/remoteEntry.js',
  menu:         process.env.NEXT_PUBLIC_MFE_MENU_URL         ?? 'http://localhost:5003/remoteEntry.js',
  orders:       process.env.NEXT_PUBLIC_MFE_ORDERS_URL       ?? 'http://localhost:5004/remoteEntry.js',
  kitchen:      process.env.NEXT_PUBLIC_MFE_KITCHEN_URL      ?? 'http://localhost:5005/remoteEntry.js',
  cashier:      process.env.NEXT_PUBLIC_MFE_CASHIER_URL      ?? 'http://localhost:5006/remoteEntry.js',
  reports:      process.env.NEXT_PUBLIC_MFE_REPORTS_URL      ?? 'http://localhost:5007/remoteEntry.js',
  reservations: process.env.NEXT_PUBLIC_MFE_RESERVATIONS_URL ?? 'http://localhost:5008/remoteEntry.js',
  tables:       process.env.NEXT_PUBLIC_MFE_TABLES_URL       ?? 'http://localhost:5014/remoteEntry.js',
} as const;

export function initFederation(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  installViteReactPreamble();
  bridgeSharedModules();

  init({
    name: 'web_shell',
    // Solo cargar los remotos eagerly (al inicio)
    remotes: [
      { name: 'core_auth_dashboard_mf', entry: MFE_URLS.core_auth_dashboard,  type: 'module' },
      { name: 'orders_tables_mf',       entry: MFE_URLS.orders_tables,        type: 'module' },
      { name: 'reservations_reports_mf', entry: MFE_URLS.reservations_reports, type: 'module' },
      // Los remotos lazy (kitchen, cashier, menu) se registran bajo demanda en loadRemote.ts
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
