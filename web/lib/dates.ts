const APP_TIMEZONE = 'Europe/Brussels';

/** Current calendar day in Brussels, as "YYYY-MM-DD". */
function todayInBrussels(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/**
 * UTC ISO timestamp for midnight of the given Brussels calendar day.
 *
 * Pretend that day at 00:00 is UTC. Then see what hour that lands on in
 * Brussels — that's the Brussels UTC offset for that date (1 in winter,
 * 2 in summer). Subtract it to get true Brussels midnight in UTC.
 *
 * Works for any whole-hour-offset timezone (i.e. all of Europe).
 */
function brusselsMidnightUtcIso(day: string): string {
  const fakeUtcMidnight = new Date(`${day}T00:00:00Z`);
  const hourInBrussels  = parseInt(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: APP_TIMEZONE, hour: '2-digit', hour12: false,
    }).format(fakeUtcMidnight),
    10,
  );
  // Some engines return "24" instead of "00" for midnight — treat as 0.
  const offsetHours = hourInBrussels === 24 ? 0 : hourInBrussels;
  return new Date(fakeUtcMidnight.getTime() - offsetHours * 3_600_000).toISOString();
}

/**
 * Returns the UTC ISO timestamp for midnight on the current calendar day
 * in the app's display timezone (Brussels). Used as the cutoff for
 * "upcoming vs past" rides so today's rides stay in the upcoming list
 * all day regardless of when they started.
 */
export function startOfTodayIso(): string {
  return brusselsMidnightUtcIso(todayInBrussels());
}

/** Current calendar year in Brussels. */
export function currentYearBrussels(): number {
  return parseInt(todayInBrussels().slice(0, 4), 10);
}

/**
 * UTC ISO timestamp for Brussels midnight on January 1st of the current
 * year. Season boundary for the kilometre totals.
 */
export function startOfYearIso(): string {
  return brusselsMidnightUtcIso(`${currentYearBrussels()}-01-01`);
}
