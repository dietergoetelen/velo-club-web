import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { buildGpx, gpxFilename } from '@/lib/gpx';
import type { Club, Route } from '@/lib/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; rideId: string }> },
) {
  const { slug, rideId } = await params;

  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const pb = await getAuthenticatedPB();

  let club: Club;
  try {
    club = await pb.collection('clubs').getFirstListItem<Club>(`slug = "${slug}"`);
  } catch {
    return new Response('Not found', { status: 404 });
  }

  let ride: Route;
  try {
    ride = await pb.collection('routes').getOne<Route>(rideId);
  } catch {
    return new Response('Not found', { status: 404 });
  }

  if (ride.club !== club.id) return new Response('Not found', { status: 404 });

  const gpx = buildGpx({
    name:        ride.name,
    date:        ride.date,
    coordinates: ride.coordinates,
  });

  return new Response(gpx, {
    status: 200,
    headers: {
      'Content-Type':        'application/gpx+xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${gpxFilename(ride.name)}"`,
      'Cache-Control':       'private, no-store',
    },
  });
}
