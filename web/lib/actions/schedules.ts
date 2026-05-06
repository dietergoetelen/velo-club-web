'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getPBWithToken } from '@/lib/pocketbase';
import { getToken, getCurrentUser } from '@/lib/session';

export async function createSchedule(form: FormData): Promise<void> {
  const clubId    = form.get('clubId')      as string;
  const slug      = form.get('slug')        as string;
  const label     = (form.get('label')      as string ?? '').trim();
  const dayOfWeek = parseInt(form.get('day_of_week') as string, 10);
  const time      = (form.get('time')       as string ?? '').trim();

  if (!label || Number.isNaN(dayOfWeek) || !time) return;
  if (dayOfWeek < 0 || dayOfWeek > 6) return;

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  const captain = await pb.collection('club_members')
    .getFirstListItem(`club = "${clubId}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);
  if (!captain) return;

  try {
    await pb.collection('club_schedules').create({
      club: clubId,
      label,
      day_of_week: dayOfWeek,
      time,
    });
  } catch (err) {
    console.error('[createSchedule]', err);
    return;
  }

  revalidatePath(`/clubs/${slug}/settings`);
  revalidatePath(`/clubs/${slug}`);
}

export async function updateSchedule(form: FormData): Promise<void> {
  const scheduleId = form.get('scheduleId') as string;
  const clubId     = form.get('clubId')     as string;
  const slug       = form.get('slug')       as string;
  const label      = (form.get('label')     as string ?? '').trim();

  if (!label) return;

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  const captain = await pb.collection('club_members')
    .getFirstListItem(`club = "${clubId}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);
  if (!captain) return;

  const sched = await pb.collection('club_schedules').getOne(scheduleId).catch(() => null);
  if (!sched || sched['club'] !== clubId) return;

  await pb.collection('club_schedules').update(scheduleId, { label }).catch(() => null);

  revalidatePath(`/clubs/${slug}/settings`);
  revalidatePath(`/clubs/${slug}`);
}

export async function deleteSchedule(form: FormData): Promise<void> {
  const scheduleId = form.get('scheduleId') as string;
  const clubId     = form.get('clubId')     as string;
  const slug       = form.get('slug')       as string;

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  const captain = await pb.collection('club_members')
    .getFirstListItem(`club = "${clubId}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);
  if (!captain) return;

  const sched = await pb.collection('club_schedules').getOne(scheduleId).catch(() => null);
  if (!sched || sched['club'] !== clubId) return;

  await pb.collection('club_schedules').delete(scheduleId).catch(() => null);

  revalidatePath(`/clubs/${slug}/settings`);
  revalidatePath(`/clubs/${slug}`);
}
