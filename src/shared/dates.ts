import { TZDate } from '@date-fns/tz';

export type Clock = () => Date;
export const now: Clock = () => new Date();
export const formatInSantiago = (date: Date, locale = 'es-CL') =>
  new Intl.DateTimeFormat(locale, {
    timeZone: 'America/Santiago', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(date);

export function startOfMonthInSantiago(date: Date): Date {
  const local = new TZDate(date, 'America/Santiago');
  local.setDate(1);
  local.setHours(0, 0, 0, 0);
  return new Date(local.getTime());
}

export function startOfNextMonthInSantiago(date: Date): Date {
  const local = new TZDate(date, 'America/Santiago');
  local.setDate(1);
  local.setHours(0, 0, 0, 0);
  local.setMonth(local.getMonth() + 1);
  return new Date(local.getTime());
}

export function dateInSantiago(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function monthInSantiago(date: Date): string {
  return dateInSantiago(date).slice(0, 7);
}

export function pickupCalendarWindow(date: Date) {
  const currentMonth = monthInSantiago(date);
  const local = new TZDate(date, 'America/Santiago');
  local.setDate(1);
  local.setHours(0, 0, 0, 0);
  local.setMonth(local.getMonth() + 2);
  const nextMonth = monthInSantiago(new Date(local.getTime() - 1));
  return { today: dateInSantiago(date), currentMonth, nextMonth };
}

export function isEligiblePickupDate(value: string, nowDate: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const candidate = new Date(Date.UTC(year!, month! - 1, day!));
  if (candidate.toISOString().slice(0, 10) !== value) return false;

  const { today, nextMonth } = pickupCalendarWindow(nowDate);
  const weekday = candidate.getUTCDay();
  return value > today && value.slice(0, 7) <= nextMonth && weekday !== 0 && weekday !== 6;
}
