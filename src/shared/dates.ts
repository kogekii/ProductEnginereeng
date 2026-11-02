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
