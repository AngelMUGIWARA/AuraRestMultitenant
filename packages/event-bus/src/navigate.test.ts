import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { emit, on } from './bus';
import { navigateTo } from './navigate';

describe('navigateTo', () => {
  let off: (() => void) | undefined;

  afterEach(() => {
    off?.();
    off = undefined;
  });

  it('emite path y replace=false por defecto', () => {
    const handler = vi.fn();
    off = on('navigate:to', handler);

    navigateTo('/waiter/tables');

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ path: '/waiter/tables', replace: false });
  });

  it('emite replace=true cuando se pasa true', () => {
    const handler = vi.fn();
    off = on('navigate:to', handler);

    navigateTo('/waiter/tables', true);

    expect(handler).toHaveBeenCalledWith({ path: '/waiter/tables', replace: true });
  });

  it('acepta query params internos', () => {
    const handler = vi.fn();
    off = on('navigate:to', handler);

    navigateTo('/waiter/orders/new?tableId=abc-123');

    expect(handler).toHaveBeenCalledWith({
      path: '/waiter/orders/new?tableId=abc-123',
      replace: false,
    });
  });

  it('rechaza URLs externas (no comienzan con /)', () => {
    expect(() => navigateTo('https://evil.com')).toThrow(
      'navigateTo: solo se permiten rutas internas',
    );
    expect(() => navigateTo('waiter/tables')).toThrow(
      'navigateTo: solo se permiten rutas internas',
    );
  });

  it('rechaza string vacío', () => {
    expect(() => navigateTo('')).toThrow('navigateTo: solo se permiten rutas internas');
  });

  it('no usa window.location como fallback', () => {
    const handler = vi.fn();
    off = on('navigate:to', handler);

    navigateTo('/test');

    expect(handler).toHaveBeenCalled();
  });
});
