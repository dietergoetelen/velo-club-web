import 'server-only';
import { getAdminPocketBase, getPBWithToken } from '@/lib/pocketbase';
import type { Club, Invite } from '@/lib/types';

/**
 * If `next` is an invite link (`/join/<token>`), add `userId` to that club and
 * return the club path so the caller can land them inside it. Returns null when
 * `next` isn't an invite or the token is invalid (caller falls back to its
 * normal redirect). Idempotent for existing members.
 *
 * Used by the auth actions so signing up / logging in through an invite joins
 * the club in one step instead of dropping the user on a "Word lid" page.
 */
export async function joinFromNextPath(
  next:      string,
  userId:    string,
  userToken: string,
): Promise<string | null> {
  const match = /^\/join\/([^/?#]+)/.exec(next || '');
  if (!match) return null;
  const token = decodeURIComponent(match[1]);

  const admin = await getAdminPocketBase().catch(() => null);
  if (!admin) return null;

  const invite = await admin.collection('invites')
    .getFirstListItem<Invite>(admin.filter('token = {:token}', { token }))
    .catch(() => null);
  if (!invite) return null;

  const club = await admin.collection('clubs').getOne<Club>(invite.club).catch(() => null);
  if (!club) return null;

  // Create the membership as the user themselves (club_members allows authed
  // self-inserts), so no elevated rights leak into the join.
  const pb = getPBWithToken(userToken);
  const already = await pb.collection('club_members')
    .getFirstListItem(`club = "${invite.club}" && user = "${userId}"`)
    .catch(() => null);
  if (!already) {
    await pb.collection('club_members')
      .create({ club: invite.club, user: userId, role: 'member', points: 0 })
      .catch(() => null);
  }

  return `/clubs/${club.slug}`;
}
