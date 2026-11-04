import type { PickupDayInput } from './pickup.js';

export interface PickupDaySelection extends PickupDayInput {
  customized: boolean;
}

export interface PickupSelection {
  commonStudentIds: string[];
  days: Record<string, PickupDaySelection>;
}

export function createPickupSelection(activeStudentIds: string[]): PickupSelection {
  return { commonStudentIds: [...new Set(activeStudentIds)], days: {} };
}

export function addPickupDay(state: PickupSelection, date: string, activeStudentIds: string[]): PickupSelection {
  if (state.days[date]) return state;
  return {
    ...state,
    days: {
      ...state.days,
      [date]: { date, studentIds: [...new Set(activeStudentIds)], customized: false },
    },
  };
}

export function removePickupDay(state: PickupSelection, date: string): PickupSelection {
  if (!state.days[date]) return state;
  const days = { ...state.days };
  delete days[date];
  return { ...state, days };
}

export function setCommonStudentIds(state: PickupSelection, studentIds: string[]): PickupSelection {
  const commonStudentIds = [...new Set(studentIds)];
  return {
    commonStudentIds,
    days: Object.fromEntries(Object.entries(state.days).map(([date, day]) => [
      date,
      day.customized ? day : { ...day, studentIds: [...commonStudentIds] },
    ])),
  };
}

export function setPickupDayStudentIds(state: PickupSelection, date: string, studentIds: string[]): PickupSelection {
  const day = state.days[date];
  if (!day) return state;
  return {
    ...state,
    days: { ...state.days, [date]: { ...day, studentIds: [...new Set(studentIds)], customized: true } },
  };
}

export function resetPickupDayToCommon(state: PickupSelection, date: string): PickupSelection {
  const day = state.days[date];
  if (!day) return state;
  return {
    ...state,
    days: { ...state.days, [date]: { ...day, studentIds: [...state.commonStudentIds], customized: false } },
  };
}

export function validatePickupSelection(state: PickupSelection): { valid: boolean; emptyDates: string[] } {
  const emptyDates = Object.values(state.days).filter(({ studentIds }) => studentIds.length === 0).map(({ date }) => date);
  return { valid: Object.keys(state.days).length > 0 && emptyDates.length === 0, emptyDates };
}

export function getPickupDays(state: PickupSelection): PickupDayInput[] {
  return Object.values(state.days).sort((left, right) => left.date.localeCompare(right.date)).map(({ date, studentIds }) => ({
    date,
    studentIds: [...studentIds].sort(),
  }));
}
