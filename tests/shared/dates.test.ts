import { describe, expect, it } from 'vitest';
import { dateInSantiago, formatInSantiago, isEligiblePickupDate, monthInSantiago, pickupCalendarWindow, startOfMonthInSantiago, startOfNextMonthInSantiago } from '../../src/shared/dates.js';

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

  it('calcula fechas y los dos meses según Santiago, también al cambiar de año', () => {
    const december = new Date('2026-12-01T02:00:00.000Z');
    expect(dateInSantiago(december)).toBe('2026-11-30');
    expect(monthInSantiago(december)).toBe('2026-11');
    expect(pickupCalendarWindow(new Date('2026-12-15T15:00:00.000Z'))).toEqual({
      today: '2026-12-15', currentMonth: '2026-12', nextMonth: '2027-01',
    });
    expect(pickupCalendarWindow(new Date('2026-02-15T15:00:00.000Z')).nextMonth).toBe('2026-03');
  });

  it('habilita desde mañana hasta el próximo mes sin excluir feriados', () => {
    const now = new Date('2026-11-02T15:00:00.000Z'); // lunes en Santiago
    expect(isEligiblePickupDate('2026-11-02', now)).toBe(false);
    expect(isEligiblePickupDate('2026-11-03', now)).toBe(true);
    expect(isEligiblePickupDate('2026-11-07', now)).toBe(false);
    expect(isEligiblePickupDate('2026-11-08', now)).toBe(false);
    expect(isEligiblePickupDate('2026-11-20', now)).toBe(true); // feriado sin tratamiento
    expect(isEligiblePickupDate('2026-12-31', now)).toBe(true);
    expect(isEligiblePickupDate('2027-01-01', now)).toBe(false);
    expect(isEligiblePickupDate('2026-02-30', now)).toBe(false);
  });
});
