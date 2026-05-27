'use server';

import { getToken, getCurrentUser } from '@/lib/session';
import { getPBWithToken } from '@/lib/pocketbase';
import type { ClubMember, PersonalRoute } from '@/lib/types';

export interface LibraryEntry {
  id:          string;
  name:        string;
  distance_km: number;
  elevation_m: number;
  coordinates: [number, number][];
  ownerName:   string;
}

export interface LibraryResult {
  fromClubMembers: LibraryEntry[];
  fromOthers:      LibraryEntry[];
  /** True when `fromOthers` was truncated. The UI can hint at this. */
  othersTruncated: boolean;
}

const OTHERS_LIMIT = 30;

/**
 * Load personal routes available to a captain as a library: routes from
 * the club's own members first, then a capped batch of routes from everyone
 * else. The cap protects the dialog from blowing up on a populated install;
 * we'll add search if it ever becomes a real problem.
 */
export async function loadRouteLibrary(clubId: string): Promise<LibraryResult> {
  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) return { fromClubMembers: [], fromOthers: [], othersTruncated: false };

  const pb = getPBWithToken(token);

  // Members of this club (ids only).
  const members = await pb.collection('club_members')
    .getFullList<ClubMember>({ filter: `club = "${clubId}"` })
    .catch(() => []);
  const memberIds = new Set(members.map(m => m.user));

  // Pull all personal routes the user is allowed to see (PB viewRule = any
  // auth). Newest first; we'll partition into the two sections client-side.
  const allRoutes = await pb.collection('personal_routes')
    .getFullList<PersonalRoute>({ sort: '-created' })
    .catch(() => []);

  // Resolve owner names — one call per unique owner.
  const ownerIds = [...new Set(allRoutes.map(r => r.user))];
  const ownerNames: Record<string, string> = {};
  await Promise.all(
    ownerIds.map(async id => {
      const u = await pb.collection('users').getOne(id).catch(() => null);
      if (!u) return;
      ownerNames[id] =
        (u['name']     as string | undefined)
        ?? (u['username'] as string | undefined)
        ?? (u['email']    as string | undefined)
        ?? '';
    }),
  );

  const toEntry = (r: PersonalRoute): LibraryEntry => ({
    id:          r.id,
    name:        r.name,
    distance_km: r.distance_km,
    elevation_m: r.elevation_m,
    coordinates: r.coordinates,
    ownerName:   ownerNames[r.user] ?? '',
  });

  const fromClubMembers: LibraryEntry[] = [];
  const fromOthersAll:   LibraryEntry[] = [];
  for (const r of allRoutes) {
    (memberIds.has(r.user) ? fromClubMembers : fromOthersAll).push(toEntry(r));
  }

  const fromOthers      = fromOthersAll.slice(0, OTHERS_LIMIT);
  const othersTruncated = fromOthersAll.length > OTHERS_LIMIT;

  return { fromClubMembers, fromOthers, othersTruncated };
}
