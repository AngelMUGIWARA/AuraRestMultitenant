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

  // ✅ OPTIMIZACIÓN DE BUILD
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        unused: true,
        passes: 2,
      },
      mangle: true,
    },
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-libs': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'ui': ['@maison/ui'],
          'konva-libs': ['konva', 'react-konva'],
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },

  // ✅ OPTIMIZACIÓN DE DEV SERVER
  server: {
    port: 5012,
    cors: true,
    fs: {
      strict: false,
    },
    middlewareMode: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5012,
      timeout: 60000,
    },
  },

  preview: {
    port: 5012,
    cors: true,
  },

  // ✅ OPTIMIZACIÓN GENERAL
  resolve: {
    dedupe: ['react', 'react-dom', 'konva', 'react-konva'],
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@maison/ui',
      '@maison/api-client',
      '@maison/auth-client',
      'konva',
      'react-konva',
    ],
  },
});
