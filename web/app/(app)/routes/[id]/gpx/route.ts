import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { buildGpx, gpxFilename } from '@/lib/gpx';
import type { PersonalRoute } from '@/lib/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const pb = await getAuthenticatedPB();

  let route: PersonalRoute;
  try {
    route = await pb.collection('personal_routes').getOne<PersonalRoute>(id);
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const gpx = buildGpx({
    name:        route.name,
    coordinates: route.coordinates,
  });

  return new Response(gpx, {
    status: 200,
    headers: {
      'Content-Type':        'application/gpx+xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${gpxFilename(route.name)}"`,
      'Cache-Control':       'private, no-store',
    },
  });
}
