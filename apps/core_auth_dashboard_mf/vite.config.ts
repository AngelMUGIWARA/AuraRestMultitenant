import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'core_auth_dashboard_mf',
      filename: 'remoteEntry.js',
      exposes: {
        './AuthApp': './src/AppAuth.tsx',
        './DashboardApp': './src/AppDashboard.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19' },
        'react-dom': { singleton: true, requiredVersion: '^19' },
        'react/jsx-runtime': { singleton: true },
        'react-router-dom': { singleton: true, requiredVersion: '^7' },
        '@maison/ui': { singleton: true },
        '@maison/api-client': { singleton: true },
        '@maison/types': { singleton: true },
        '@maison/event-bus': { singleton: true },
        '@maison/auth-client': { singleton: true },
      },
    }),
  ],
  build: {
    target: 'esnext',
  },
  server: {
    port: 5011,
    cors: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  preview: {
    port: 5011,
    cors: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
});
