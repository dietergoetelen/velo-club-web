'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { getPBWithToken } from '@/lib/pocketbase';
import { getToken, getCurrentUser } from '@/lib/session';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const MAX_CLUBS_PER_CAPTAIN = 10;

export async function createClub(
  _prev: string | null,
  form: FormData,
): Promise<string | null> {
  const name        = (form.get('name')        as string).trim();
  const description = (form.get('description') as string).trim();
  const avatar      = form.get('avatar') as File | null;

  const t = await getTranslations('errors');

  if (!name) return t('clubNameRequired');

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb   = getPBWithToken(token);
  const slug = slugify(name);

  const captainCount = await pb.collection('club_members')
    .getList(1, 1, { filter: `user = "${user.id}" && role = "captain"` })
    .then(r => r.totalItems)
    .catch(() => 0);
  if (captainCount >= MAX_CLUBS_PER_CAPTAIN) {
    return t('tooManyClubs', { max: MAX_CLUBS_PER_CAPTAIN });
  }

  const existing = await pb.collection('clubs')
    .getFirstListItem(`slug = "${slug}"`)
    .catch(() => null);
  if (existing) return t('clubNameTaken', { name });

  const data: Record<string, unknown> = { name, description, slug };
  if (avatar && avatar.size > 0) data['avatar'] = avatar;

  try {
    const club = await pb.collection('clubs').create(data);
    await pb.collection('club_members').create({
      club:   club.id,
      user:   user.id,
      role:   'captain',
      points: 0,
    });
  } catch {
    return t('createClubFailed');
  }

  redirect(`/clubs/${slug}`);
}

export async function requestToJoin(
  _prev: string | null,
  form: FormData,
): Promise<string | null> {
  const clubId = form.get('clubId') as string;
  const slug   = form.get('slug')   as string;

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const t  = await getTranslations('errors');
  const pb = getPBWithToken(token);

  const alreadyMember = await pb.collection('club_members')
    .getFirstListItem(`club = "${clubId}" && user = "${user.id}"`)
    .catch(() => null);
  if (alreadyMember) return t('alreadyMember');

  const existingRequest = await pb.collection('join_requests')
    .getFirstListItem(`club = "${clubId}" && user = "${user.id}" && status = "pending"`)
    .catch(() => null);
  if (existingRequest) return t('requestPending');

  try {
    await pb.collection('join_requests').create({
      club:   clubId,
      user:   user.id,
      status: 'pending',
    });
  } catch (err) {
    console.error('[requestToJoin]', err);
    return t('requestFailed');
  }

  redirect(`/clubs/${slug}`);
}

export async function updateClub(
  _prev: string | null,
  form: FormData,
): Promise<string | null> {
  const clubId           = form.get('clubId')           as string;
  const slug             = form.get('slug')             as string;
  const name             = (form.get('name')            as string).trim();
  const description      = (form.get('description')     as string).trim();
  const avatar           = form.get('avatar')           as File | null;
  const avatarRemove     = form.get('avatar_remove')    === '1';
  const schedulesEnabled = form.get('schedules_enabled') === '1';

  const startLatRaw = form.get('start_lat') as string | null;
  const startLngRaw = form.get('start_lng') as string | null;
  const startLat    = startLatRaw ? parseFloat(startLatRaw) : 0;
  const startLng    = startLngRaw ? parseFloat(startLngRaw) : 0;

  const t = await getTranslations('errors');

  if (!name) return t('clubNameRequired');

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  const membership = await pb.collection('club_members')
    .getFirstListItem(`club = "${clubId}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);
  if (!membership) return t('captainOnlyEdit');

  const data: Record<string, unknown> = {
    name,
    description,
    schedules_enabled: schedulesEnabled,
    start_lat:         Number.isFinite(startLat) ? startLat : 0,
    start_lng:         Number.isFinite(startLng) ? startLng : 0,
  };
  if (avatar && avatar.size > 0) data['avatar'] = avatar;
  else if (avatarRemove)         data['avatar'] = null;

  try {
    await pb.collection('clubs').update(clubId, data);
  } catch {
    return t('saveChangesFailed');
  }

  revalidatePath(`/clubs/${slug}`);
  redirect(`/clubs/${slug}`);
}

export async function approveJoinRequest(form: FormData): Promise<void> {
  const requestId = form.get('requestId') as string;
  const clubId    = form.get('clubId')    as string;
  const slug      = form.get('slug')      as string;

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  const membership = await pb.collection('club_members')
    .getFirstListItem(`club = "${clubId}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);
  if (!membership) return;

  const req = await pb.collection('join_requests').getOne(requestId).catch(() => null);
  if (!req) return;

  await pb.collection('club_members').create({
    club:   clubId,
    user:   req['user'],
    role:   'member',
    points: 0,
  });
  await pb.collection('join_requests').update(requestId, { status: 'approved' });

  revalidatePath(`/clubs/${slug}`);
}

export async function promoteToCaptain(form: FormData): Promise<void> {
  const memberId = form.get('memberId') as string;
  const clubId   = form.get('clubId')   as string;
  const slug     = form.get('slug')     as string;

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  const captain = await pb.collection('club_members')
    .getFirstListItem(`club = "${clubId}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);
  if (!captain) return;

  const target = await pb.collection('club_members').getOne(memberId).catch(() => null);
  if (!target || target['club'] !== clubId || target['role'] === 'captain') return;

  await pb.collection('club_members').update(memberId, { role: 'captain' }).catch(() => null);

  revalidatePath(`/clubs/${slug}`);
}

export async function rejectJoinRequest(form: FormData): Promise<void> {
  const requestId = form.get('requestId') as string;
  const clubId    = form.get('clubId')    as string;
  const slug      = form.get('slug')      as string;

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  const membership = await pb.collection('club_members')
    .getFirstListItem(`club = "${clubId}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);
  if (!membership) return;

  await pb.collection('join_requests').update(requestId, { status: 'rejected' }).catch(() => null);

  revalidatePath(`/clubs/${slug}`);
}
