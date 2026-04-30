import type { ClubSchedule } from './types';

export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
] as const;

export const DAY_NAMES_SHORT = [
  'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
] as const;

/**
 * Returns the next Date matching `dayOfWeek` (0=Sun..6=Sat) at "HH:MM",
 * relative to `from`. If today matches and the time is still in the future,
 * today is returned.
 */
export function nextOccurrence(
  dayOfWeek: number,
  time: string,
  from: Date = new Date(),
): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(from);
  result.setSeconds(0, 0);

  const dayDiff = (dayOfWeek - result.getDay() + 7) % 7;
  result.setDate(result.getDate() + dayDiff);
  result.setHours(hours, minutes, 0, 0);

  if (result.getTime() <= from.getTime()) {
    result.setDate(result.getDate() + 7);
  }
  return result;
}

export interface ScheduleOccurrence {
  schedule: ClubSchedule;
  date:     Date;
}

/**
 * For each schedule, computes the next occurrence and filters to those
 * within `windowDays` from `from`. Sorted by date ascending.
 */
export function upcomingOccurrences(
  schedules:  ClubSchedule[],
  windowDays: number = 7,
  from:       Date   = new Date(),
): ScheduleOccurrence[] {
  const cutoff = from.getTime() + windowDays * 24 * 60 * 60 * 1000;
  return schedules
    .map(schedule => ({ schedule, date: nextOccurrence(schedule.day_of_week, schedule.time, from) }))
    .filter(o => o.date.getTime() <= cutoff)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
