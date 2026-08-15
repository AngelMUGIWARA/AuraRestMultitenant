import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'cashier_mf',
      filename: 'remoteEntry.js',
      exposes: { './App': './src/App.tsx' },
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

  // ✅ OPTIMIZACIÓN DE BUILD
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, unused: true, passes: 2 },
      mangle: true,
      format: { comments: false },
    },
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: { 'react-libs': ['react', 'react-dom'], 'ui': ['@maison/ui'] },
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },

  // ✅ OPTIMIZACIÓN DE DEV SERVER
  server: {
    port: 5006,
    cors: true,
    fs: { strict: false },
    middlewareMode: false,
    hmr: { protocol: 'ws', host: 'localhost', port: 5006, timeout: 60000 },
  },

  preview: {
    port: 5006,
    cors: true,
  },

  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@maison/ui', '@maison/api-client', '@maison/auth-client'],
  },

  esbuild: {
    drop: ['console', 'debugger'],
  },
});
