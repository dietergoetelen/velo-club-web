'use server';

import { redirect } from 'next/navigation';
import { getPBWithToken } from '@/lib/pocketbase';
import { getToken, getCurrentUser } from '@/lib/session';
import crypto from 'crypto';

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

export async function createInvitation(
  _prev: { error: string | null; link: string | null },
  form: FormData,
): Promise<{ error: string | null; link: string | null }> {
  const email  = (form.get('email') as string).trim();
  const clubId = form.get('clubId') as string;

  if (!email) return { error: 'Email is required.', link: null };

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  // Verify current user is captain of this club
  const membership = await pb.collection('club_members')
    .getFirstListItem(`club = "${clubId}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);

  if (!membership) return { error: 'Only the captain can invite members.', link: null };

  const inviteToken = crypto.randomBytes(24).toString('hex');
  const expires     = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    await pb.collection('invitations').create({
      club:     clubId,
      email,
      token:    inviteToken,
      accepted: false,
      expires,
    });
  } catch {
    return { error: 'Failed to create invitation.', link: null };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  return { error: null, link: `${baseUrl}/invite/${inviteToken}` };
}
