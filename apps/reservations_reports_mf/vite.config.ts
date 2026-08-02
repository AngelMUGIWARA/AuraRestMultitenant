import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'reservations_reports_mf',
      filename: 'remoteEntry.js',
      exposes: {
        './ReservationsApp': './src/AppReservations.tsx',
        './ReportsApp': './src/AppReports.tsx',
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
        'recharts': { singleton: true, requiredVersion: '^3' },
        'jspdf': { singleton: true, requiredVersion: '^4' },
      },
    }),
  ],
  build: {
    target: 'esnext',
  },
  server: {
    port: 5013,
    cors: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  preview: {
    port: 5013,
    cors: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
});
