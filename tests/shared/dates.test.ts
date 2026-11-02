import { describe, expect, it } from 'vitest';
import { formatInSantiago, startOfMonthInSantiago, startOfNextMonthInSantiago } from '../../src/shared/dates.js';

describe('fechas en America/Santiago', () => {
  it('muestra un evento nocturno en el día local correcto', () => {
    expect(formatInSantiago(new Date('2026-11-03T02:30:00.000Z'))).toContain('2 de noviembre');
  });

  it('calcula correctamente el inicio del mes y del siguiente mes', () => {
    const current = new Date('2026-11-15T12:00:00.000Z');
    expect(startOfMonthInSantiago(current).toISOString()).toBe('2026-11-01T03:00:00.000Z');
    expect(startOfNextMonthInSantiago(current).toISOString()).toBe('2026-12-01T03:00:00.000Z');
  });

  it('considera el cambio de horario de verano entre marzo y mayo', () => {
    expect(startOfMonthInSantiago(new Date('2026-03-20T12:00:00.000Z')).toISOString()).toBe('2026-03-01T03:00:00.000Z');
    expect(startOfMonthInSantiago(new Date('2026-05-20T12:00:00.000Z')).toISOString()).toBe('2026-05-01T04:00:00.000Z');
  });
});
