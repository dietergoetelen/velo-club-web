'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getToken, getCurrentUser } from '@/lib/session';
import { getPBWithToken, getAdminPocketBase } from '@/lib/pocketbase';
import type { Attendance } from '@/lib/types';

export async function toggleAttendance(form: FormData): Promise<void> {
  const rideId = form.get('rideId') as string;
  const slug   = form.get('slug')   as string;

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  const ride = await pb.collection('routes').getOne(rideId).catch(() => null);
  if (!ride) redirect(`/clubs/${slug}`);

  // Only club members can RSVP.
  const membership = await pb.collection('club_members')
    .getFirstListItem(`club = "${ride!['club']}" && user = "${user.id}"`)
    .catch(() => null);
  if (!membership) redirect(`/clubs/${slug}`);

  const existing = await pb.collection('attendances')
    .getFirstListItem<Attendance>(`route = "${rideId}" && user = "${user.id}"`)
    .catch(() => null);

  if (existing) {
    await pb.collection('attendances').delete(existing.id).catch(() => null);
  } else {
    await pb.collection('attendances').create({ route: rideId, user: user.id }).catch(() => null);
  }

  revalidatePath(`/clubs/${slug}`);
  revalidatePath(`/clubs/${slug}/rides/${rideId}`);
  // The dashboard's next-ride card carries the same RSVP toggle, so it has to
  // re-render when attendance changes from anywhere.
  revalidatePath('/dashboard');
}

/**
 * Captain-only attendance correction: remove another rider's attendance from a
 * ride after the fact, when they RSVP'd but weren't actually there. Those rows
 * drive the season km leaderboard, so a no-show shouldn't keep the credit.
 */
export async function removeAttendance(form: FormData): Promise<void> {
  const rideId = form.get('rideId') as string;
  const slug   = form.get('slug')   as string;
  const userId = form.get('userId') as string;  // the attendee being removed

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  const ride = await pb.collection('routes').getOne(rideId).catch(() => null);
  if (!ride) redirect(`/clubs/${slug}`);

  // Only the club captain may correct someone else's attendance.
  const captaincy = await pb.collection('club_members')
    .getFirstListItem(`club = "${ride!['club']}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);
  if (!captaincy) redirect(`/clubs/${slug}/rides/${rideId}`);

  // The attendances deleteRule only allows deleting your own row, so removing
  // someone else's needs admin auth — gated behind the captaincy check above.
  const admin = await getAdminPocketBase().catch(() => null);
  if (!admin) redirect(`/clubs/${slug}/rides/${rideId}`);

  const row = await admin.collection('attendances')
    .getFirstListItem<Attendance>(`route = "${rideId}" && user = "${userId}"`)
    .catch(() => null);
  if (row) {
    await admin.collection('attendances').delete(row.id).catch(() => null);
  }

  revalidatePath(`/clubs/${slug}`);
  revalidatePath(`/clubs/${slug}/rides/${rideId}`);
  revalidatePath('/dashboard');
}
