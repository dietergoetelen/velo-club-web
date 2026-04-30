import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { RidePlanner } from './ride-planner';
import type { Club, ClubMember, ClubSchedule } from '@/lib/types';

export default async function NewRidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const pb = await getAuthenticatedPB();

  let club: Club;
  try {
    club = await pb.collection('clubs').getFirstListItem<Club>(`slug = "${slug}"`);
  } catch {
    notFound();
  }

  const membership = await pb.collection('club_members')
    .getFirstListItem<ClubMember>(
      `club = "${club.id}" && user = "${user.id}" && role = "captain"`,
    )
    .catch(() => null);

  if (!membership) redirect(`/clubs/${slug}`);

  const schedules = club.schedules_enabled
    ? await pb.collection('club_schedules').getFullList<ClubSchedule>({
        filter: `club = "${club.id}"`,
        sort:   'day_of_week,time',
      }).catch(() => [])
    : [];

  const clubStart = (club.start_lat !== 0 || club.start_lng !== 0)
    ? { lat: club.start_lat, lng: club.start_lng }
    : null;

  return (
    <RidePlanner
      clubId={club.id}
      slug={slug}
      clubName={club.name}
      schedules={schedules}
      clubStart={clubStart}
    />
  );
}
