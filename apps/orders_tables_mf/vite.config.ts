import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'orders_tables_mf',
      filename: 'remoteEntry.js',
      exposes: {
        './OrdersApp': './src/AppOrders.tsx',
        './TablesApp': './src/AppTables.tsx',
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
        'konva': { singleton: true, requiredVersion: '^10' },
        'react-konva': { singleton: true, requiredVersion: '^19' },
      },
    }),
  ],
  build: {
    target: 'esnext',
  },
  server: {
    port: 5012,
    cors: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  preview: {
    port: 5012,
    cors: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
});
