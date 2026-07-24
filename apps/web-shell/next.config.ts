import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Fija explícitamente la raíz del workspace para Turbopack. Sin esto,
  // Next.js la infiere buscando lockfiles hacia arriba en el filesystem y
  // puede elegir un directorio equivocado (p. ej. uno fuera del repo con
  // otro lockfile suelto), rompiendo la resolución de rutas de app/.
  // Debe ser la raíz del monorepo (no la de este paquete): con pnpm, las
  // dependencias como "next" son symlinks hacia node_modules/.pnpm en la
  // raíz, y Turbopack no sigue symlinks que apunten fuera de esta raíz.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },

  // SOFEA: genera HTML/CSS/JS estáticos puros — cero SSR en runtime.
  // El servidor solo sirve archivos; toda la UI corre en el cliente.
  output: "export",

  // Requerido por output:export (desactiva optimización server-side de imágenes)
  images: { unoptimized: true },

  // Permite que Next.js/webpack compile los paquetes del workspace directamente
  // desde su fuente TypeScript, sin necesidad de un paso de build previo.
  transpilePackages: [
    "@maison/types",
    "@maison/api-client",
    "@maison/ui",
    "@maison/event-bus",
    "@maison/auth-client",
  ],
};

export default nextConfig;
