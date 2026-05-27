'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { getToken, getCurrentUser } from '@/lib/session';
import { getPBWithToken } from '@/lib/pocketbase';
import type { PersonalRoute } from '@/lib/types';

// ── Create ────────────────────────────────────────────────────────────────────

export async function savePersonalRoute(
  _prev: string | null,
  form:  FormData,
): Promise<string | null> {
  const name        = (form.get('name')        as string).trim();
  const distanceKm  = parseFloat(form.get('distanceKm')  as string);
  const elevationM  = parseFloat(form.get('elevationM')  as string);
  const coordinates = JSON.parse(form.get('coordinates') as string) as [number, number][];

  const t = await getTranslations('errors');

  if (!name)                return t('routeNameRequired');
  if (!coordinates?.length) return t('noRouteSelected');

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  let created: PersonalRoute;
  try {
    created = await pb.collection('personal_routes').create<PersonalRoute>({
      user:        user.id,
      name,
      distance_km: distanceKm,
      elevation_m: elevationM,
      coordinates,
    });
  } catch (err) {
    console.error('[savePersonalRoute]', err);
    return t('saveRouteFailed');
  }

  revalidatePath('/dashboard');
  redirect(`/routes/${created.id}`);
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updatePersonalRoute(
  _prev: string | null,
  form:  FormData,
): Promise<string | null> {
  const routeId     = form.get('routeId')     as string;
  const name        = (form.get('name')       as string).trim();
  const distanceKm  = parseFloat(form.get('distanceKm')  as string);
  const elevationM  = parseFloat(form.get('elevationM')  as string);
  const coordinates = JSON.parse(form.get('coordinates') as string) as [number, number][];

  const t = await getTranslations('errors');

  if (!name)                return t('routeNameRequired');
  if (!coordinates?.length) return t('noRouteSelected');

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  const existing = await pb.collection('personal_routes').getOne<PersonalRoute>(routeId).catch(() => null);
  if (!existing) return t('routeNotFound');
  if (existing.user !== user.id) return t('notRouteOwner');

  try {
    await pb.collection('personal_routes').update(routeId, {
      name,
      distance_km: distanceKm,
      elevation_m: elevationM,
      coordinates,
    });
  } catch (err) {
    console.error('[updatePersonalRoute]', err);
    return t('saveRouteFailed');
  }

  revalidatePath('/dashboard');
  revalidatePath(`/routes/${routeId}`);
  redirect(`/routes/${routeId}`);
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deletePersonalRoute(form: FormData): Promise<void> {
  const routeId = form.get('routeId') as string;

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  const existing = await pb.collection('personal_routes').getOne<PersonalRoute>(routeId).catch(() => null);
  if (!existing) redirect('/dashboard');
  if (existing!.user !== user.id) redirect(`/routes/${routeId}`);

  await pb.collection('personal_routes').delete(routeId).catch(() => null);

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
