import { emit } from './bus';

/**
 * Solicita navegación SPA desde un MFE hacia una ruta del shell.
 * Solo acepta rutas internas que comiencen con `/`.
 * El web-shell debe escuchar `navigate:to` y resolver con su router.
 *
 * @param path - Ruta interna (debe comenzar con `/`)
 * @param replace - Si `true`, reemplaza el historial en lugar de hacer push
 */
export function navigateTo(path: string, replace = false): void {
  if (!path.startsWith('/')) {
    throw new Error(`navigateTo: solo se permiten rutas internas. Recibido: "${path}"`);
  }
  emit('navigate:to', { path, replace });
}
