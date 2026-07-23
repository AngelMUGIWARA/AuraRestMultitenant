import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@maison/api-client': path.resolve(__dirname, '../../packages/api-client/src'),
      '@maison/auth-client': path.resolve(__dirname, '../../packages/auth-client/src'),
      '@maison/event-bus': path.resolve(__dirname, '../../packages/event-bus/src'),
      '@maison/types': path.resolve(__dirname, '../../packages/types/src'),
      '@maison/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
