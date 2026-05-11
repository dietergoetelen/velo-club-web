import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { RideCard } from '@/components/ride-card';
import { type StackedUser } from '@/components/avatar-stack';
import { startOfTodayIso } from '@/lib/dates';
import type { Attendance, Club, ClubSchedule, Route } from '@/lib/types';

export default async function PastRidesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const tDetail = await getTranslations('clubs.detail');

  const pb = await getAuthenticatedPB();

  let club: Club;
  try {
    club = await pb.collection('clubs').getFirstListItem<Club>(`slug = "${slug}"`);
  } catch {
    notFound();
  }

  // Mirror the club page's cutoff so a ride only becomes "past" at Brussels
  // midnight — not the moment its start time passes.
  const cutoff = startOfTodayIso();

  const rides = await pb.collection('routes').getFullList<Route>({
    filter: `club = "${club.id}" && status != "cancelled" && date < "${cutoff}"`,
    sort:   '-date',
  }).catch(() => []);

  const [schedules, attendances] = await Promise.all([
    club.schedules_enabled
      ? pb.collection('club_schedules').getFullList<ClubSchedule>({
          filter: `club = "${club.id}"`,
        }).catch(() => [])
      : Promise.resolve([] as ClubSchedule[]),
    rides.length > 0
      ? pb.collection('attendances').getFullList<Attendance>({
          filter: rides.map(r => `route = "${r.id}"`).join(' || '),
        }).catch(() => [])
      : Promise.resolve([] as Attendance[]),
  ]);

  const scheduleById = new Map(schedules.map(s => [s.id, s]));

  // Resolve attendee user info — needed for the avatar stacks on each card.
  const attendeeIds = [...new Set(attendances.map(a => a.user))];
  const usersById: Record<string, { name: string; username: string; email: string; avatar: string }> = {};
  await Promise.all(
    attendeeIds.map(id =>
      pb.collection('users').getOne(id)
        .then(u => {
          usersById[id] = {
            name:     u['name']     as string,
            username: u['username'] as string,
            email:    u['email']    as string,
            avatar:   u['avatar']   as string,
          };
        })
        .catch(() => {}),
    ),
  );

  const attendeesByRide = new Map<string, StackedUser[]>();
  for (const a of attendances) {
    const u = usersById[a.user];
    if (!u) continue;
    const list = attendeesByRide.get(a.route) ?? [];
    list.push({
      id:     a.user,
      name:   u.name || u.username || u.email,
      avatar: u.avatar ?? '',
    });
    attendeesByRide.set(a.route, list);
  }

  return (
    <div className="space-y-6">

      <div>
        <Link
          href={`/clubs/${slug}`}
          className="eyebrow mb-3 inline-flex items-center gap-1.5 hover:text-accent transition-colors"
        >
          {tDetail('backToClub')}
        </Link>
        <h1 className="font-heading font-black text-2xl text-ink tracking-tight leading-tight">
          {tDetail('pastRidesTitle')}
        </h1>
      </div>

      {rides.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-heading font-bold text-lg text-ink">{tDetail('pastRidesEmpty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rides.map((ride, i) => (
            <RideCard
              key={ride.id}
              ride={ride}
              slug={slug}
              index={i}
              scheduleLabel={scheduleById.get(ride.schedule)?.label.trim()}
              attendees={attendeesByRide.get(ride.id) ?? []}
            />
          ))}
        </div>
      )}

    </div>
  );
}
