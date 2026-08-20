/**
 * Tests de Timezone: Verificar que fecha/hora se interpretan como hora
 * local de Ciudad de México (offset fijo -06:00, sin horario de verano
 * desde 2022).
 *
 * El contrato establece que frontend y backend hablan en hora de CDMX,
 * no en UTC crudo. Antes, el frontend calculaba "hoy"/"ahora" en UTC
 * mientras el backend interpretaba esos mismos valores como si fueran
 * UTC también — el resultado práctico era que una reserva capturada a
 * las 7pm (hora real de México) se guardaba/mostraba con 6 horas de
 * diferencia, y el "día" cambiaba a medianoche UTC (6pm hora de México)
 * en vez de a medianoche real.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function todayDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
}

function nowTimeString(): string {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
  });
}

describe('Timezone - Frontend en hora de Ciudad de México', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('todayDateString()', () => {
    it('debe devolver la fecha en formato YYYY-MM-DD, hora de México', () => {
      // 15:30 UTC = 09:30 en México (UTC-6): mismo día calendario
      vi.setSystemTime(new Date('2026-07-24T15:30:45.000Z'));

      expect(todayDateString()).toBe('2026-07-24');
      expect(todayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('NO debe ser la fecha UTC cuando difieren por el offset de México', () => {
      // 04:00 UTC del día 25 = 22:00 del día 24 en México (UTC-6).
      // La fecha UTC ya es 25, pero la fecha real en México sigue siendo 24.
      vi.setSystemTime(new Date('2026-07-25T04:00:00.000Z'));

      expect(todayDateString()).toBe('2026-07-24');
    });

    it('debe cambiar de día hasta medianoche real de México (06:00 UTC), no a medianoche UTC', () => {
      // 05:59:59 UTC = 23:59:59 del día anterior en México
      vi.setSystemTime(new Date('2026-07-25T05:59:59.000Z'));
      expect(todayDateString()).toBe('2026-07-24');

      // 06:00:00 UTC = 00:00:00 en México: aquí sí cambia el día
      vi.setSystemTime(new Date('2026-07-25T06:00:00.000Z'));
      expect(todayDateString()).toBe('2026-07-25');
    });
  });

  describe('nowTimeString()', () => {
    it('debe devolver la hora en formato HH:MM, hora de México (UTC-6)', () => {
      vi.setSystemTime(new Date('2026-07-24T14:35:45.000Z'));

      // 14:35 UTC - 6h = 08:35 en México
      expect(nowTimeString()).toBe('08:35');
      expect(nowTimeString()).toMatch(/^\d{2}:\d{2}$/);
    });

    it('debe cambiar de hora exactamente cada minuto (en hora de México)', () => {
      vi.setSystemTime(new Date('2026-07-24T14:35:59.999Z'));
      expect(nowTimeString()).toBe('08:35');

      vi.setSystemTime(new Date('2026-07-24T14:36:00.000Z'));
      expect(nowTimeString()).toBe('08:36');
    });

    it('debe preservar minutos exactos sin redondear segundos', () => {
      vi.setSystemTime(new Date('2026-07-24T14:35:45.000Z'));

      expect(nowTimeString()).toBe('08:35');
      expect(nowTimeString()).not.toBe('08:36');
    });
  });

  describe('Flujo completo: Date + Time (México) → UTC real en el backend', () => {
    it('fecha/hora local de México se reconstruye al instante UTC correcto', () => {
      vi.setSystemTime(new Date('2026-07-24T14:35:00.000Z'));

      const date = todayDateString(); // "2026-07-24"
      const time = nowTimeString(); // "08:35" (14:35 UTC - 6h)

      // Backend reconstruye: new Date(`${date}T${time}:00.000-06:00`)
      const scheduledAt = new Date(`${date}T${time}:00.000-06:00`);

      expect(scheduledAt.toISOString()).toBe('2026-07-24T14:35:00.000Z');
    });

    it('el cambio de día en México (06:00 UTC) se propaga correctamente al reconstruir', () => {
      // 23:50 hora de México del día 24
      vi.setSystemTime(new Date('2026-07-25T05:50:00.000Z'));

      const date = todayDateString();
      const time = nowTimeString();
      expect(date).toBe('2026-07-24');
      expect(time).toBe('23:50');

      const scheduledAt = new Date(`${date}T${time}:00.000-06:00`);
      expect(scheduledAt.toISOString()).toBe('2026-07-25T05:50:00.000Z');

      // 10 minutos después: 00:00 hora de México del día 25
      vi.setSystemTime(new Date('2026-07-25T06:00:00.000Z'));

      const dateAfter = todayDateString();
      const timeAfter = nowTimeString();
      expect(dateAfter).toBe('2026-07-25');
      expect(timeAfter).toBe('00:00');

      const scheduledAtAfter = new Date(`${dateAfter}T${timeAfter}:00.000-06:00`);
      expect(scheduledAtAfter.toISOString()).toBe('2026-07-25T06:00:00.000Z');
    });

    it('el payload enviado al backend siempre reconstruye el instante UTC correcto', () => {
      const cases = [
        { mockTime: '2026-07-25T06:00:00.000Z', expectedDate: '2026-07-25', expectedTime: '00:00' },
        { mockTime: '2026-07-25T18:30:00.000Z', expectedDate: '2026-07-25', expectedTime: '12:30' },
        { mockTime: '2026-12-31T05:59:00.000Z', expectedDate: '2026-12-30', expectedTime: '23:59' },
      ];

      cases.forEach(({ mockTime, expectedDate, expectedTime }) => {
        vi.setSystemTime(new Date(mockTime));

        const date = todayDateString();
        const time = nowTimeString();

        expect(date).toBe(expectedDate);
        expect(time).toBe(expectedTime);

        const scheduledAt = new Date(`${date}T${time}:00.000-06:00`);
        expect(scheduledAt.toISOString()).toBe(mockTime);
      });
    });
  });

  describe('Validaciones temporales en el frontend (comparación lexicográfica de strings)', () => {
    it('comparación de fecha funciona igual en formato YYYY-MM-DD', () => {
      vi.setSystemTime(new Date('2026-07-24T14:35:00.000Z')); // "2026-07-24" en México

      const today = todayDateString();
      expect('2026-07-23' < today).toBe(true);
      expect('2026-07-25' < today).toBe(false);
    });

    it('comparación de hora funciona igual en formato HH:MM', () => {
      vi.setSystemTime(new Date('2026-07-24T14:35:00.000Z')); // "08:35" en México

      const now = nowTimeString();
      expect('08:30' < now).toBe(true);
      expect('08:40' < now).toBe(false);
    });

    it('debe rechazar una hora ya pasada hoy (hora de México)', () => {
      vi.setSystemTime(new Date('2026-07-24T14:35:00.000Z')); // "2026-07-24" "08:35"

      const today = todayDateString();
      const now = nowTimeString();
      const userDate = today;
      const userTime = '08:30'; // 5 minutos antes

      expect(userDate === today && userTime < now).toBe(true);
    });

    it('debe permitir una hora futura hoy (hora de México)', () => {
      vi.setSystemTime(new Date('2026-07-24T14:35:00.000Z'));

      const today = todayDateString();
      const now = nowTimeString();
      const userDate = today;
      const userTime = '09:00'; // 25 minutos después

      expect(userDate === today && userTime < now).toBe(false);
    });
  });
});
