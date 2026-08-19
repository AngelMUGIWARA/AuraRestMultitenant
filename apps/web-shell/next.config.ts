import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactCompiler: true,

  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },

  output: "export",
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
};

export default nextConfig;
