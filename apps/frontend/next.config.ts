import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // SOFEA: genera HTML/CSS/JS estáticos puros — cero SSR en runtime.
  // El servidor solo sirve archivos; toda la UI corre en el cliente.
  output: "export",

  // Requerido por output:export (desactiva optimización server-side de imágenes)
  images: { unoptimized: true },

  // Permite que Next.js/webpack compile los paquetes del workspace directamente
  // desde su fuente TypeScript, sin necesidad de un paso de build previo.
  transpilePackages: ["@maison/types", "@maison/api-client", "@maison/ui", "@maison/event-bus"],
};

export default nextConfig;
