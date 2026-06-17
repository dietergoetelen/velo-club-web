import 'server-only';
import type PocketBase from 'pocketbase';
import { getTranslations } from 'next-intl/server';
import { sendPushToUsers } from './push';
import type { BucketOption, BucketVote, Club, ClubMember, PersonalRoute, RouteBucket } from './types';

export interface VoteTally {
  option: string;  // BucketOption.id
  route:  string;  // PersonalRoute.id
  count:  number;
}

/** Per-option vote counts for a bucket, highest first. */
export async function tallyVotes(pb: PocketBase, bucketId: string): Promise<VoteTally[]> {
  const [options, votes] = await Promise.all([
    pb.collection('bucket_options').getFullList<BucketOption>({ filter: `bucket = "${bucketId}"`, requestKey: null }).catch(() => [] as BucketOption[]),
    pb.collection('bucket_votes').getFullList<BucketVote>({ filter: `bucket = "${bucketId}"`, requestKey: null }).catch(() => [] as BucketVote[]),
  ]);
  const counts = new Map<string, number>();
  for (const v of votes) counts.set(v.option, (counts.get(v.option) ?? 0) + 1);
  return options
    .map(o => ({ option: o.id, route: o.route, count: counts.get(o.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

/**
 * The unambiguous winner, or null when there's a tie, no votes, or no options
 * — in which case the bucket closes but waits for the captain to pick.
 */
export function clearWinner(tally: VoteTally[]): VoteTally | null {
  if (tally.length === 0 || tally[0].count === 0) return null;
  if (tally.length > 1 && tally[1].count === tally[0].count) return null;
  return tally[0];
}

/** Build the proposed club ride from the winning library route + bucket date. */
async function createRideFromWinner(
  pb:        PocketBase,
  bucket:    RouteBucket,
  routeId:   string,
): Promise<string | null> {
  const route = await pb.collection('personal_routes').getOne<PersonalRoute>(routeId).catch(() => null);
  if (!route) return null;

  const ride = await pb.collection('routes').create({
    club:        bucket.club,
    created_by:  bucket.created_by,
    name:        route.name,
    date:        bucket.ride_date,
    distance_km: route.distance_km,
    elevation_m: route.elevation_m,
    surface:     'road',
    coordinates: route.coordinates,
    status:      'proposed',
    schedule:    '',
  }).catch(() => null);
  if (!ride) return null;

  // Result notification — same "ride planned" push members already know.
  const club = await pb.collection('clubs').getOne<Club>(bucket.club).catch(() => null);
  if (club) {
    const members = await pb.collection('club_members')
      .getFullList<ClubMember>({ filter: `club = "${bucket.club}"`, requestKey: null })
      .catch(() => [] as ClubMember[]);
    const memberIds = members.map(m => m.user);
    if (memberIds.length > 0) {
      const tPush = await getTranslations('push');
      await sendPushToUsers(memberIds, {
        title: club.name,
        body:  tPush('bucketResultBody', { name: route.name }),
        url:   `/clubs/${club.slug}/rides/${ride.id}`,
        tag:   `ride-${ride.id}`,
      });
    }
  }

  return ride.id;
}

export interface ResolveResult {
  rideId:  string | null;  // created ride, when a winner was determined
  winner:  string | null;  // winning PersonalRoute.id
}

/**
 * Close a bucket and, if there's a winner, spawn the ride. Pass `forcedRoute`
 * for a captain override / tie-break (a PersonalRoute.id that's an option in
 * this bucket); otherwise the top-voted route wins. A tie with no forced pick
 * closes the bucket without a ride, leaving the captain to choose.
 *
 * Shared by the deadline cron (admin auth) and the captain actions (their own
 * token), so it takes whichever PB client the caller already holds.
 */
export async function resolveBucket(
  pb:          PocketBase,
  bucket:      RouteBucket,
  forcedRoute?: string,
): Promise<ResolveResult> {
  let winner = forcedRoute ?? null;
  if (!winner) {
    const w = clearWinner(await tallyVotes(pb, bucket.id));
    winner = w ? w.route : null;
  }

  if (!winner) {
    await pb.collection('route_buckets').update(bucket.id, { status: 'closed' }).catch(() => null);
    return { rideId: null, winner: null };
  }

  const rideId = await createRideFromWinner(pb, bucket, winner);
  await pb.collection('route_buckets').update(bucket.id, {
    status:        'closed',
    winning_route: winner,
    created_ride:  rideId ?? '',
  }).catch(() => null);

  return { rideId, winner };
}
