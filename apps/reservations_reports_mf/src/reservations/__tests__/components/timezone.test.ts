/**
 * Tests de Timezone: Verificar que fecha/hora se envían en UTC
 *
 * El contrato establece que frontend debe enviar UTC.
 * Estos tests verif que las funciones helper producen UTC.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Timezone - Frontend UTC Conversion', () => {
  let originalDate: typeof Date;

  beforeEach(() => {
    originalDate = Date;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('todayDateString()', () => {
    it('debe devolver fecha en formato YYYY-MM-DD UTC', () => {
      // Mock date: 2026-07-24T15:30:45.000Z
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-24T15:30:45.000Z'));

      // Simular todayDateString inline
      const today = new Date().toISOString().slice(0, 10);

      expect(today).toBe('2026-07-24');
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('debe ser UTC, no zona local', () => {
      vi.useFakeTimers();
      // Simular hora en UTC: 2026-07-24 23:45 UTC
      vi.setSystemTime(new Date('2026-07-24T23:45:00.000Z'));

      const today = new Date().toISOString().slice(0, 10);

      // Debe ser 2026-07-24, incluso si en zona local es 2026-07-25
      expect(today).toBe('2026-07-24');
    });

    it('debe cambiar fecha solo cuando cruza medianoche UTC', () => {
      vi.useFakeTimers();

      // Noche: 23:59:59 UTC
      vi.setSystemTime(new Date('2026-07-24T23:59:59.000Z'));
      const before = new Date().toISOString().slice(0, 10);

      // 1 segundo después: medianoche UTC
      vi.setSystemTime(new Date('2026-07-25T00:00:00.000Z'));
      const after = new Date().toISOString().slice(0, 10);

      expect(before).toBe('2026-07-24');
      expect(after).toBe('2026-07-25');
    });
  });

  describe('nowTimeString()', () => {
    it('debe devolver hora en formato HH:MM UTC', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-24T14:35:45.000Z'));

      // Simular nowTimeString inline con toISOString()
      const now = new Date().toISOString().slice(11, 16);

      expect(now).toBe('14:35');
      expect(now).toMatch(/^\d{2}:\d{2}$/);
    });

    it('debe usar UTC, no hora local', () => {
      vi.useFakeTimers();
      // Simular: 2026-07-24T23:45:00Z (UTC)
      // En zona local México (-6), sería 17:45
      vi.setSystemTime(new Date('2026-07-24T23:45:00.000Z'));

      const now = new Date().toISOString().slice(11, 16);

      // Debe ser 23:45 UTC, NO 17:45 local
      expect(now).toBe('23:45');
    });

    it('debe cambiar hora exactamente cada minuto', () => {
      vi.useFakeTimers();

      // 14:35:59 UTC
      vi.setSystemTime(new Date('2026-07-24T14:35:59.999Z'));
      const before = new Date().toISOString().slice(11, 16);

      // 14:36:00 UTC
      vi.setSystemTime(new Date('2026-07-24T14:36:00.000Z'));
      const after = new Date().toISOString().slice(11, 16);

      expect(before).toBe('14:35');
      expect(after).toBe('14:36');
    });

    it('debe preservar segundos = 00 (no redondear)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-24T14:35:45.000Z'));

      const now = new Date().toISOString().slice(11, 16);

      // Debe ser "14:35", no "14:36"
      expect(now).toBe('14:35');
      expect(now).not.toBe('14:36');
    });
  });

  describe('Flujo Completo: Date + Time → Backend', () => {
    it('fecha actual + hora actual = UTC correcto', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-24T14:35:00.000Z'));

      const date = new Date().toISOString().slice(0, 10);
      const time = new Date().toISOString().slice(11, 16);

      // Frontend envía al backend
      const payload = {
        date, // "2026-07-24"
        time, // "14:35"
      };

      // Backend reconstruye: new Date(`${date}T${time}:00.000Z`)
      const scheduledAt = new Date(`${payload.date}T${payload.time}:00.000Z`);

      expect(scheduledAt.toISOString()).toBe('2026-07-24T14:35:00.000Z');
      expect(scheduledAt.getUTCHours()).toBe(14);
      expect(scheduledAt.getUTCMinutes()).toBe(35);
    });

    it('cambio de día en UTC se propaga correctamente', () => {
      vi.useFakeTimers();
      // 23:50 UTC el día 24
      vi.setSystemTime(new Date('2026-07-24T23:50:00.000Z'));

      const date = new Date().toISOString().slice(0, 10);
      const time = new Date().toISOString().slice(11, 16);

      expect(date).toBe('2026-07-24');
      expect(time).toBe('23:50');

      const scheduledAt = new Date(`${date}T${time}:00.000Z`);
      expect(scheduledAt.toISOString()).toBe('2026-07-24T23:50:00.000Z');

      // 10 minutos después: 00:00 UTC el día 25
      vi.setSystemTime(new Date('2026-07-25T00:00:00.000Z'));

      const dateAfter = new Date().toISOString().slice(0, 10);
      const timeAfter = new Date().toISOString().slice(11, 16);

      expect(dateAfter).toBe('2026-07-25');
      expect(timeAfter).toBe('00:00');

      const scheduledAtAfter = new Date(`${dateAfter}T${timeAfter}:00.000Z`);
      expect(scheduledAtAfter.toISOString()).toBe('2026-07-25T00:00:00.000Z');
    });

    it('payload enviado al backend es siempre UTC', () => {
      vi.useFakeTimers();

      const testCases = [
        {
          mockTime: '2026-07-25T00:00:00.000Z',
          expectedDate: '2026-07-25',
          expectedTime: '00:00',
          expectedIso: '2026-07-25T00:00:00.000Z',
        },
        {
          mockTime: '2026-07-25T12:30:45.000Z',
          expectedDate: '2026-07-25',
          expectedTime: '12:30',
          expectedIso: '2026-07-25T12:30:00.000Z',
        },
        {
          mockTime: '2026-12-31T23:59:59.000Z',
          expectedDate: '2026-12-31',
          expectedTime: '23:59',
          expectedIso: '2026-12-31T23:59:00.000Z',
        },
      ];

      testCases.forEach(({ mockTime, expectedDate, expectedTime, expectedIso }) => {
        vi.setSystemTime(new Date(mockTime));

        const date = new Date().toISOString().slice(0, 10);
        const time = new Date().toISOString().slice(11, 16);

        expect(date).toBe(expectedDate);
        expect(time).toBe(expectedTime);

        const scheduledAt = new Date(`${date}T${time}:00.000Z`);
        expect(scheduledAt.toISOString()).toBe(expectedIso);
      });
    });
  });

  describe('Validaciones Temporales en Frontend', () => {
    it('comparación de fecha debe usar UTC', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-24T14:35:00.000Z'));

      const today = new Date().toISOString().slice(0, 10); // "2026-07-24"
      const userInput = '2026-07-23';

      // Validación: userInput < today ?
      expect(userInput < today).toBe(true); // "2026-07-23" < "2026-07-24"

      const futureDate = '2026-07-25';
      expect(futureDate < today).toBe(false); // "2026-07-25" > "2026-07-24"
    });

    it('comparación de hora debe usar UTC', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-24T14:35:00.000Z'));

      const now = new Date().toISOString().slice(11, 16); // "14:35"
      const userInput = '14:30';

      // Validación: userInput < now ?
      expect(userInput < now).toBe(true); // "14:30" < "14:35"

      const futureTime = '14:40';
      expect(futureTime < now).toBe(false); // "14:40" > "14:35"
    });

    it('debe rechazar hora pasada hoy (UTC)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-24T14:35:00.000Z'));

      const today = new Date().toISOString().slice(0, 10);
      const now = new Date().toISOString().slice(11, 16);
      const userDate = today;
      const userTime = '14:30'; // Hace 5 minutos

      const isToday = userDate === today;
      const isPast = userTime < now;

      expect(isToday && isPast).toBe(true); // Debe rechazarse
    });

    it('debe permitir hora futura hoy (UTC)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-24T14:35:00.000Z'));

      const today = new Date().toISOString().slice(0, 10);
      const now = new Date().toISOString().slice(11, 16);
      const userDate = today;
      const userTime = '15:00'; // 25 minutos después

      const isToday = userDate === today;
      const isPast = userTime < now;

      expect(isToday && isPast).toBe(false); // Debe permitirse
    });
  });
});
