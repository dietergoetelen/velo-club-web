'use server';

import { redirect } from 'next/navigation';
import { getToken, getCurrentUser } from '@/lib/session';
import { getPBWithToken } from '@/lib/pocketbase';
import { fetchThreeRoutes, fetchEditedRoute } from '@/lib/graphhopper';
import type { RideRoute } from '@/lib/types';

// ── Generate ──────────────────────────────────────────────────────────────────

export type GenerateResult =
  | { ok: true;  routes: RideRoute[] }
  | { ok: false; error: string };

export async function generateRoutes(
  lat:        number,
  lng:        number,
  distanceKm: number,
  profile?:   string,
): Promise<GenerateResult> {
  try {
    const routes = await fetchThreeRoutes(lat, lng, distanceKm, profile);
    return { ok: true, routes };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[generateRoutes]', msg);
    return { ok: false, error: msg };
  }
}

// ── Recalc edited route ───────────────────────────────────────────────────────

export type RecalcResult =
  | { ok: true;  distance: number; elevation: number; coordinates: [number, number][] }
  | { ok: false; error: string };

export async function recalcEditedRoute(
  start:     { lat: number; lng: number },
  waypoints: { lat: number; lng: number }[],
  profile?:  string,
): Promise<RecalcResult> {
  try {
    const r = await fetchEditedRoute(start, waypoints, profile);
    return { ok: true, ...r };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[recalcEditedRoute]', msg);
    return { ok: false, error: msg };
  }
}

// ── Save ──────────────────────────────────────────────────────────────────────

export async function saveRide(
  _prev: string | null,
  form:  FormData,
): Promise<string | null> {
  const clubId      = form.get('clubId')      as string;
  const slug        = form.get('slug')        as string;
  const name        = (form.get('name')       as string).trim();
  const date        = form.get('date')        as string;
  const time        = form.get('time')        as string;
  const distanceKm  = parseFloat(form.get('distanceKm')  as string);
  const elevationM  = parseFloat(form.get('elevationM')  as string);
  const coordinates = JSON.parse(form.get('coordinates') as string) as [number, number][];
  const scheduleId  = (form.get('scheduleId') as string | null) ?? '';

  if (!name)              return 'Give the ride a name.';
  if (!date)              return 'Pick a date.';
  if (!time)              return 'Pick a start time.';
  if (!coordinates?.length) return 'No route selected.';

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  const membership = await pb.collection('club_members')
    .getFirstListItem(`club = "${clubId}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);
  if (!membership) return 'Only the captain can plan rides.';

  try {
    await pb.collection('routes').create({
      club:        clubId,
      created_by:  user.id,
      name,
      date:        `${date} ${time}:00.000Z`,
      distance_km: distanceKm,
      elevation_m: elevationM,
      surface:     'road',
      coordinates,
      status:      'proposed',
      schedule:    scheduleId,
    });
  } catch (err) {
    console.error('[saveRide]', err);
    return 'Failed to save ride. Please try again.';
  }

  redirect(`/clubs/${slug}`);
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteRide(form: FormData): Promise<void> {
  const rideId = form.get('rideId') as string;
  const slug   = form.get('slug')   as string;

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  const ride = await pb.collection('routes').getOne(rideId).catch(() => null);
  if (!ride) redirect(`/clubs/${slug}`);

  const captain = await pb.collection('club_members')
    .getFirstListItem(`club = "${ride!['club']}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);
  if (!captain) redirect(`/clubs/${slug}/rides/${rideId}`);

  await pb.collection('routes').delete(rideId).catch(() => null);

  redirect(`/clubs/${slug}`);
}
