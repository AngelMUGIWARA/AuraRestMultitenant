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
        'jspdf-autotable': { singleton: true, requiredVersion: '^5' },
      },
    }),
  ],

  // ✅ OPTIMIZACIÓN DE BUILD
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        unused: true,
        passes: 2,
      },
      mangle: true,
      format: {
        comments: false,
      },
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
          'charts': ['recharts'],
          'pdf': ['jspdf', 'jspdf-autotable'],
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },

  // ✅ OPTIMIZACIÓN DE DEV SERVER
  server: {
    port: 5013,
    cors: true,
    fs: {
      strict: false,
    },
    middlewareMode: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5013,
      timeout: 60000,
    },
  },

  preview: {
    port: 5013,
    cors: true,
  },

  // ✅ OPTIMIZACIÓN GENERAL
  resolve: {
    dedupe: ['react', 'react-dom', 'recharts', 'jspdf', 'jspdf-autotable'],
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@maison/ui',
      '@maison/api-client',
      '@maison/auth-client',
      'recharts',
      'jspdf',
      'jspdf-autotable',
    ],
  },

  esbuild: {
    drop: ['console', 'debugger'],
  },
});
