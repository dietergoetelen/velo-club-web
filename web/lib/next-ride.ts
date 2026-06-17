import 'server-only';
import type PocketBase from 'pocketbase';
import { startOfTodayIso } from './dates';
import type { StackedUser } from '@/components/avatar-stack';
import type { Attendance, Route } from './types';

export interface NextRide {
  ride:        Route;
  attendees:   StackedUser[];
  isAttending: boolean;
}

/**
 * The single soonest upcoming ride for a club, with its attendee list resolved
 * for the dashboard's next-ride card. Returns null when the club has nothing
 * coming up. "Upcoming" matches the rest of the app: a ride stays current for
 * the whole of today (cutoff = start of today, Brussels).
 */
export async function getNextRideForClub(
  pb:     PocketBase,
  clubId: string,
  userId: string,
): Promise<NextRide | null> {
  // PB stores datetimes with a space, not "T", and compares date filters as
  // strings — see lib/reminders.ts. Match the stored shape so a ride later on
  // the cutoff day isn't dropped at the boundary.
  const cutoff = startOfTodayIso().replace('T', ' ');

  const ride = await pb.collection('routes').getFirstListItem<Route>(
    `club = "${clubId}" && status != "cancelled" && status != "completed" && date >= "${cutoff}"`,
    { sort: 'date', requestKey: null },
  ).catch(() => null);
  if (!ride) return null;

  const attendances = await pb.collection('attendances').getFullList<Attendance>({
    filter:     `route = "${ride.id}"`,
    requestKey: null,
  }).catch(() => [] as Attendance[]);

  const attendees: StackedUser[] = (await Promise.all(
    attendances.map(async a => {
      const u = await pb.collection('users').getOne(a.user).catch(() => null);
      if (!u) return null;
      const name = (u['name'] as string) || (u['username'] as string) || (u['email'] as string);
      return { id: a.user, name, avatar: ((u['avatar'] as string) ?? '') as string };
    }),
  )).filter((u): u is StackedUser => u !== null);

  return {
    ride,
    attendees,
    isAttending: attendances.some(a => a.user === userId),
  };
}
