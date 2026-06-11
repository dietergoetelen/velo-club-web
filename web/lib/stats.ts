import 'server-only';
import type PocketBase from 'pocketbase';
import { yearInBrussels } from './dates';
import type { Attendance, Route } from './types';

/**
 * Ridden-kilometre totals, computed live from attendances on past,
 * non-cancelled rides. Deliberately not stored on club_members: totals stay
 * correct when someone confirms or withdraws their attendance after the
 * ride, and there's no increment to keep idempotent.
 *
 * The route/user columns on attendances are plain text ids (not PB
 * relations), so there's no expand/dot-filter — we fetch rides and
 * attendances separately and join here.
 */

export interface RiderTotals {
  user:  string;  // PB user id
  rides: number;
  km:    number;
}

// Slim projection — full Route records drag the entire coordinates array
// along, which is megabytes over a season.
type RideSlim = Pick<Route, 'id' | 'distance_km' | 'date'>;

const RIDE_FIELDS = 'id,distance_km,date';

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// OR-chained id filters, chunked so the query string stays well under URL
// length limits.
const ID_CHUNK = 75;

async function attendancesForRides(pb: PocketBase, rideIds: string[]): Promise<Attendance[]> {
  const out: Attendance[] = [];
  for (const ids of chunk(rideIds, ID_CHUNK)) {
    const rows = await pb.collection('attendances').getFullList<Attendance>({
      filter:     ids.map(id => `route = "${id}"`).join(' || '),
      requestKey: null,
    }).catch(() => [] as Attendance[]);
    out.push(...rows);
  }
  return out;
}

export interface YearTotals {
  year:   number;
  totals: RiderTotals[];
}

/**
 * Per-member totals for one club, grouped by (Brussels) calendar year, all
 * from a single rides + attendances fetch. `until` is exclusive — pass the
 * start-of-today cutoff so a ride only counts once it's past. Years sorted
 * newest first; totals sorted by km, then ride count.
 */
export async function clubRiderTotalsByYear(
  pb: PocketBase,
  clubId: string,
  until: string,
): Promise<YearTotals[]> {
  const rides = await pb.collection('routes').getFullList<RideSlim>({
    filter:     `club = "${clubId}" && status != "cancelled" && date < "${until}"`,
    fields:     RIDE_FIELDS,
    requestKey: null,
  }).catch(() => [] as RideSlim[]);
  if (rides.length === 0) return [];

  const rideById    = new Map(rides.map(r => [r.id, r]));
  const attendances = await attendancesForRides(pb, [...rideById.keys()]);

  const byYear = new Map<number, Map<string, RiderTotals>>();
  for (const a of attendances) {
    const ride = rideById.get(a.route);
    if (!ride) continue;
    const year   = yearInBrussels(ride.date);
    const byUser = byYear.get(year) ?? new Map<string, RiderTotals>();
    const totals = byUser.get(a.user) ?? { user: a.user, rides: 0, km: 0 };
    totals.rides += 1;
    totals.km    += ride.distance_km;
    byUser.set(a.user, totals);
    byYear.set(year, byUser);
  }

  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, byUser]) => ({
      year,
      totals: [...byUser.values()].sort((a, b) => b.km - a.km || b.rides - a.rides),
    }));
}

/**
 * One user's totals across all clubs: all-time plus the slice since `since`
 * (start of the current year).
 */
export async function userRiderTotals(
  pb: PocketBase,
  userId: string,
  { since, until }: { since: string; until: string },
): Promise<{ allTime: RiderTotals; thisYear: RiderTotals }> {
  const allTime:  RiderTotals = { user: userId, rides: 0, km: 0 };
  const thisYear: RiderTotals = { user: userId, rides: 0, km: 0 };

  const attendances = await pb.collection('attendances').getFullList<Attendance>({
    filter:     `user = "${userId}"`,
    requestKey: null,
  }).catch(() => [] as Attendance[]);
  if (attendances.length === 0) return { allTime, thisYear };

  const rideIds = [...new Set(attendances.map(a => a.route))];
  // PB serialises dates as "YYYY-MM-DD HH:MM:SS.sssZ" (space, not "T"), so
  // the in-JS year split compares timestamps rather than strings.
  const sinceMs = new Date(since).getTime();

  for (const ids of chunk(rideIds, ID_CHUNK)) {
    const idFilter = ids.map(id => `id = "${id}"`).join(' || ');
    const rides = await pb.collection('routes').getFullList<RideSlim>({
      filter:     `(${idFilter}) && status != "cancelled" && date < "${until}"`,
      fields:     RIDE_FIELDS,
      requestKey: null,
    }).catch(() => [] as RideSlim[]);

    for (const ride of rides) {
      allTime.rides += 1;
      allTime.km    += ride.distance_km;
      if (new Date(ride.date).getTime() >= sinceMs) {
        thisYear.rides += 1;
        thisYear.km    += ride.distance_km;
      }
    }
  }
  return { allTime, thisYear };
}
