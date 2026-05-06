import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { RideEdit } from './ride-edit';
import type { Club, ClubMember, Route } from '@/lib/types';

export default async function RideEditPage({
  params,
}: {
  params: Promise<{ slug: string; rideId: string }>;
}) {
  const { slug, rideId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const pb = await getAuthenticatedPB();

  let club: Club;
  try {
    club = await pb.collection('clubs').getFirstListItem<Club>(`slug = "${slug}"`);
  } catch {
    notFound();
  }

  const captain = await pb.collection('club_members')
    .getFirstListItem<ClubMember>(
      `club = "${club.id}" && user = "${user.id}" && role = "captain"`,
    )
    .catch(() => null);
  if (!captain) redirect(`/clubs/${slug}/rides/${rideId}`);

  let ride: Route;
  try {
    ride = await pb.collection('routes').getOne<Route>(rideId);
  } catch {
    notFound();
  }
  if (ride.club !== club.id) notFound();

  const [startLat, startLng] = ride.coordinates[0];

  return (
    <RideEdit
      rideId={ride.id}
      slug={slug}
      clubName={club.name}
      rideName={ride.name}
      startPos={{ lat: startLat, lng: startLng }}
      coordinates={ride.coordinates}
      distance={ride.distance_km}
      elevation={ride.elevation_m}
    />
  );
}
