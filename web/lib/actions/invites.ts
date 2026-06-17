'use server';

import crypto from 'crypto';
import { redirect } from 'next/navigation';
import { getToken, getCurrentUser } from '@/lib/session';
import { getPBWithToken, getAdminPocketBase } from '@/lib/pocketbase';
import type { Club, Invite } from '@/lib/types';

export type InviteResult = { token: string } | { error: true };

/** URL-safe, unguessable token (~16 chars). */
function newToken(): string {
  return crypto.randomBytes(12).toString('base64url');
}

/**
 * Confirm the current user captains `clubId`. Returns the user's PB client on
 * success (caller still uses admin for the superuser-only invites table), or
 * null when not a captain / not authed.
 */
async function captainPb(clubId: string) {
  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) return null;

  const pb = getPBWithToken(token);
  const captain = await pb.collection('club_members')
    .getFirstListItem(`club = "${clubId}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);
  return captain ? { pb, userId: user.id } : null;
}

/**
 * The club's invite token, creating one on first use. Idempotent — repeated
 * calls return the same link until it's regenerated. Captain-only.
 */
export async function getOrCreateInvite(clubId: string): Promise<InviteResult> {
  const ctx = await captainPb(clubId);
  if (!ctx) return { error: true };

  const admin = await getAdminPocketBase().catch(() => null);
  if (!admin) return { error: true };

  const existing = await admin.collection('invites')
    .getFirstListItem<Invite>(`club = "${clubId}"`)
    .catch(() => null);
  if (existing) return { token: existing.token };

  const created = await admin.collection('invites')
    .create<Invite>({ token: newToken(), club: clubId, created_by: ctx.userId })
    .catch(() => null);
  return created ? { token: created.token } : { error: true };
}

/**
 * Rotate the club's invite token, invalidating any link already shared.
 * Captain-only.
 */
export async function regenerateInvite(clubId: string): Promise<InviteResult> {
  const ctx = await captainPb(clubId);
  if (!ctx) return { error: true };

  const admin = await getAdminPocketBase().catch(() => null);
  if (!admin) return { error: true };

  const token    = newToken();
  const existing = await admin.collection('invites')
    .getFirstListItem<Invite>(`club = "${clubId}"`)
    .catch(() => null);

  const saved = existing
    ? await admin.collection('invites').update<Invite>(existing.id, { token }).catch(() => null)
    : await admin.collection('invites').create<Invite>({ token, club: clubId, created_by: ctx.userId }).catch(() => null);

  return saved ? { token: saved.token } : { error: true };
}

/**
 * Accept an invite: add the current user to the token's club as a member, then
 * land them inside the club. Bounces to /join/<token> when not signed in (the
 * landing page routes them through auth and back). Idempotent for existing
 * members.
 */
export async function joinViaInvite(form: FormData): Promise<void> {
  const token     = form.get('token') as string;
  const userToken = await getToken();
  const user      = await getCurrentUser();
  if (!userToken || !user) redirect(`/join/${token}`);

  const admin = await getAdminPocketBase().catch(() => null);
  if (!admin) redirect('/dashboard');

  // Token is user-supplied → bind it so it can't break out of the filter.
  const invite = await admin!.collection('invites')
    .getFirstListItem<Invite>(admin!.filter('token = {:token}', { token }))
    .catch(() => null);
  if (!invite) redirect('/dashboard');

  const club = await admin!.collection('clubs').getOne<Club>(invite!.club).catch(() => null);
  if (!club) redirect('/dashboard');

  const pb = getPBWithToken(userToken!);
  const already = await pb.collection('club_members')
    .getFirstListItem(`club = "${invite!.club}" && user = "${user!.id}"`)
    .catch(() => null);
  if (!already) {
    await pb.collection('club_members')
      .create({ club: invite!.club, user: user!.id, role: 'member', points: 0 })
      .catch(() => null);
  }

  redirect(`/clubs/${club!.slug}`);
}
