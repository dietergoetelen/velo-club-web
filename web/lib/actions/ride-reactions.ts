'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getToken, getCurrentUser } from '@/lib/session';
import { getPBWithToken } from '@/lib/pocketbase';
import { REACTION_EMOJIS, type ReactionEmoji, type RideReaction } from '@/lib/types';

/**
 * Toggle a reaction on a ride.
 *
 *   - No existing reaction → create one with `emoji`.
 *   - Existing reaction with same emoji → delete (un-react).
 *   - Existing reaction with different emoji → switch.
 */
export async function toggleReaction(form: FormData): Promise<void> {
  const rideId = form.get('rideId') as string;
  const slug   = form.get('slug')   as string;
  const emoji  = form.get('emoji')  as string;

  if (!REACTION_EMOJIS.includes(emoji as ReactionEmoji)) return;

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb   = getPBWithToken(token);
  const ride = await pb.collection('routes').getOne(rideId).catch(() => null);
  if (!ride) redirect(`/clubs/${slug}`);

  // Members only.
  const membership = await pb.collection('club_members')
    .getFirstListItem(`club = "${ride!['club']}" && user = "${user.id}"`)
    .catch(() => null);
  if (!membership) redirect(`/clubs/${slug}`);

  const existing = await pb.collection('ride_reactions')
    .getFirstListItem<RideReaction>(`route = "${rideId}" && user = "${user.id}"`)
    .catch(() => null);

  if (!existing) {
    await pb.collection('ride_reactions').create({
      route: rideId,
      user:  user.id,
      emoji,
    }).catch(() => null);
  } else if (existing.emoji === emoji) {
    await pb.collection('ride_reactions').delete(existing.id).catch(() => null);
  } else {
    await pb.collection('ride_reactions').update(existing.id, { emoji }).catch(() => null);
  }

  revalidatePath(`/clubs/${slug}`);
  revalidatePath(`/clubs/${slug}/rides/${rideId}`);
}
