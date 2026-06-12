import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfe_admin',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App.tsx',
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
      },
    }),
  ],
  build: {
    target: 'esnext',
  },
  server: {
    port: 5002,
    cors: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  preview: {
    port: 5002,
    cors: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
});
