'use client';

import { init } from '@module-federation/runtime';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

let initialized = false;

export function initFederation(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // @module-federation/vite stores shared modules in globalThis.__mf_module_cache__.share,
  // while @module-federation/runtime uses globalThis.__FEDERATION__.__SHARE__.
  // Without this bridge the MFE never receives the shell's React and falls back to its
  // own bundled copy → two React instances → dispatcher null → hooks crash.
  const mfCache = ((globalThis as any).__mf_module_cache__ ??= { share: {}, remote: {} });
  mfCache.share ??= {};
  if (!mfCache.share.react) mfCache.share.react = React;
  if (!mfCache.share['react-dom']) mfCache.share['react-dom'] = ReactDOM;

  init({
    name: 'shell',
    remotes: [
      {
        name: 'mfe_admin',
        entry:
          process.env.NEXT_PUBLIC_MFE_ADMIN_URL ??
          'http://localhost:5002/remoteEntry.js',
        type: 'module',
      },
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
