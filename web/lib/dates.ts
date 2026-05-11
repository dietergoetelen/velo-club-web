const APP_TIMEZONE = 'Europe/Brussels';

/**
 * Returns the UTC ISO timestamp for midnight on the current calendar day
 * in the app's display timezone (Brussels). Used as the cutoff for
 * "upcoming vs past" rides so today's rides stay in the upcoming list
 * all day regardless of when they started.
 *
 * Works for any whole-hour-offset timezone (i.e. all of Europe).
 */
export function startOfTodayIso(): string {
  // 1. What calendar day is it right now in Brussels?
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  // 2. Pretend that day at 00:00 is UTC. Then see what hour that lands on
  //    in Brussels — that's the current Brussels UTC offset (1 in winter,
  //    2 in summer). Subtract it to get true Brussels midnight in UTC.
  const fakeUtcMidnight = new Date(`${today}T00:00:00Z`);
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
