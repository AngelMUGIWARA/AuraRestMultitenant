import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactCompiler: true,

  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },

  output: "standalone",
  images: { unoptimized: true },

  transpilePackages: [
    "@maison/types",
    "@maison/api-client",
    "@maison/ui",
    "@maison/event-bus",
    "@maison/auth-client",
  ],

  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,

  // Permite en desarrollo que el navegador acceda a recursos del dev server
  // (HMR, fuentes) desde el host público del EC2. El host se configura en
  // apps/web-shell/.env via NEXT_PUBLIC_DEV_ORIGIN (solo aplica en `next dev`).
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    ...(process.env.NEXT_PUBLIC_DEV_ORIGIN
      ? process.env.NEXT_PUBLIC_DEV_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
      : []),
  ],
};

export default nextConfig;
