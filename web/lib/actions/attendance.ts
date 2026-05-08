'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getToken, getCurrentUser } from '@/lib/session';
import { getPBWithToken } from '@/lib/pocketbase';
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
}
