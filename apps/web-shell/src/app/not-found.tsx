'use client';

import Link from 'next/link';
import { IconChevronRight } from '@maison/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 px-4">
      <div className="text-center max-w-md w-full">
        {/* Error Code */}
        <div className="mb-6">
          <h1 className="text-8xl font-bold text-primary-500 mb-2">404</h1>
          <p className="text-sm text-text-secondary uppercase tracking-widest">
            Página no encontrada
          </p>
        </div>

        {/* Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-text-primary mb-3">
            La página que buscas no existe
          </h2>
          <p className="text-text-secondary leading-relaxed">
            La ruta que solicitaste no está disponible. Verifica la URL o vuelve al inicio.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
          >
            Ir al inicio
            <IconChevronRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border-primary rounded-lg font-medium text-text-primary hover:bg-surface-1 transition-colors"
          >
            Volver atrás
          </button>
        </div>

        {/* Decorative Element */}
        <div className="mt-12 pt-8 border-t border-border-primary">
          <p className="text-xs text-text-secondary">
            Si crees que esto es un error, contacta con soporte.
          </p>
        </div>
      </div>
    </div>
  );
}
