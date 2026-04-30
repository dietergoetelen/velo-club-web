'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getPBWithToken } from '@/lib/pocketbase';
import { getToken, getCurrentUser } from '@/lib/session';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function createClub(
  _prev: string | null,
  form: FormData,
): Promise<string | null> {
  const name        = (form.get('name')        as string).trim();
  const description = (form.get('description') as string).trim();

  if (!name) return 'Club name is required.';

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb   = getPBWithToken(token);
  const slug = slugify(name);

  try {
    const club = await pb.collection('clubs').create({ name, description, slug });
    await pb.collection('club_members').create({
      club:       club.id,
      user:       user.id,
      user_name:  user.name,
      user_email: user.email,
      role:       'captain',
      points:     0,
    });
  } catch {
    return 'Failed to create club. The name may already be taken.';
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

  const pb = getPBWithToken(token);

  const alreadyMember = await pb.collection('club_members')
    .getFirstListItem(`club = "${clubId}" && user = "${user.id}"`)
    .catch(() => null);
  if (alreadyMember) return 'You are already a member of this club.';

  const existingRequest = await pb.collection('join_requests')
    .getFirstListItem(`club = "${clubId}" && user = "${user.id}" && status = "pending"`)
    .catch(() => null);
  if (existingRequest) return 'You already have a pending request.';

  try {
    await pb.collection('join_requests').create({
      club:       clubId,
      user:       user.id,
      user_name:  user.name,
      user_email: user.email,
      status:     'pending',
    });
  } catch {
    return 'Failed to send request. Please try again.';
  }

  redirect(`/clubs/${slug}`);
}

export async function updateClub(
  _prev: string | null,
  form: FormData,
): Promise<string | null> {
  const clubId      = form.get('clubId')      as string;
  const slug        = form.get('slug')        as string;
  const name        = (form.get('name')        as string).trim();
  const description = (form.get('description') as string).trim();

  if (!name) return 'Club name is required.';

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  const membership = await pb.collection('club_members')
    .getFirstListItem(`club = "${clubId}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);
  if (!membership) return 'Only the captain can edit club settings.';

  try {
    await pb.collection('clubs').update(clubId, { name, description });
  } catch {
    return 'Failed to save changes.';
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
    club:       clubId,
    user:       req['user'],
    user_name:  req['user_name'],
    user_email: req['user_email'],
    role:       'member',
    points:     0,
  });
  await pb.collection('join_requests').update(requestId, { status: 'approved' });

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
