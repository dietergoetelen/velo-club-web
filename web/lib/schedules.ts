import type { ClubSchedule } from './types';

// Sunday-first to match JS getDay() and PocketBase's day_of_week (0=Sun..6=Sat).
// Computed via Intl.DateTimeFormat using fixed Sunday reference dates so the
// names always come from the platform ICU data — no hand-maintained list.
const DAY_REFERENCE_DATES = [
  new Date(Date.UTC(2024, 0, 7)),  // Sun 7 Jan 2024
  new Date(Date.UTC(2024, 0, 8)),  // Mon 8 Jan 2024
  new Date(Date.UTC(2024, 0, 9)),
  new Date(Date.UTC(2024, 0, 10)),
  new Date(Date.UTC(2024, 0, 11)),
  new Date(Date.UTC(2024, 0, 12)),
  new Date(Date.UTC(2024, 0, 13)),
];

const LONG_DAY_FMT  = new Intl.DateTimeFormat('nl-BE', { weekday: 'long',  timeZone: 'UTC' });
const SHORT_DAY_FMT = new Intl.DateTimeFormat('nl-BE', { weekday: 'short', timeZone: 'UTC' });

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

export const DAY_NAMES = DAY_REFERENCE_DATES.map(d => capitalize(LONG_DAY_FMT.format(d))) as readonly string[];
export const DAY_NAMES_SHORT = DAY_REFERENCE_DATES.map(d => capitalize(SHORT_DAY_FMT.format(d))) as readonly string[];

/**
 * Comparator that orders schedules by day-of-week (Mon-first), then time,
 * then label. PocketBase sorts `day_of_week` numerically, which puts Sunday
 * (0) before Monday — undesirable for EU users.
 */
export function compareSchedules(
  a: { day_of_week: number; time: string; label: string },
  b: { day_of_week: number; time: string; label: string },
): number {
  const da = (a.day_of_week + 6) % 7;
  const db = (b.day_of_week + 6) % 7;
  if (da !== db)         return da - db;
  if (a.time !== b.time) return a.time.localeCompare(b.time);
  const al = a.label.trim().toLowerCase();
  const bl = b.label.trim().toLowerCase();
  return al < bl ? -1 : al > bl ? 1 : 0;
}

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

/**
 * Returns the schedule whose `(day_of_week, time)` matches the given local
 * `YYYY-MM-DD` + `HH:MM`, or `undefined` if none match. Used to keep the
 * "Use schedule" link valid when the captain picks any future date that
 * happens to fall on a recurring schedule slot, not just the next one.
 */
export function findMatchingSchedule(
  schedules: ClubSchedule[],
  date:      string,
  time:      string,
): ClubSchedule | undefined {
  const dow = new Date(`${date}T00:00:00`).getDay();
  return schedules.find(s => s.day_of_week === dow && s.time === time);
}
