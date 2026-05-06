import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import type { Club, ClubMember, Route } from '@/lib/types';
import RideMapClient from './ride-map-client';
import { DeleteRideButton } from './delete-ride-button';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export default async function RideDetailPage({
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

  let ride: Route;
  try {
    ride = await pb.collection('routes').getOne<Route>(rideId);
  } catch {
    notFound();
  }

  if (ride.club !== club.id) notFound();

  const isCaptain = await pb.collection('club_members')
    .getFirstListItem<ClubMember>(`club = "${club.id}" && user = "${user.id}" && role = "captain"`)
    .then(() => true)
    .catch(() => false);

  return (
    <div className="fixed inset-0 top-16 z-10 flex" style={{ backgroundColor: 'var(--paper)' }}>

      {/* ══ Left panel ══════════════════════════════════════════════════════ */}
      <div
        className="w-[380px] shrink-0 flex flex-col overflow-hidden"
        style={{ borderRight: '2px solid var(--ink)' }}
      >
        {/* Header */}
        <div
          className="px-7 pt-7 pb-5 shrink-0"
          style={{ borderBottom: '2px solid var(--line)' }}
        >
          <Link
            href={`/clubs/${slug}`}
            className="eyebrow mb-3 inline-flex items-center gap-1.5 hover:text-accent transition-colors"
          >
            ← {club.name}
          </Link>
          <h1 className="font-heading font-black text-2xl text-ink tracking-tight leading-tight">
            {ride.name}
          </h1>
        </div>

        {/* Details */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">

          {/* Date & time */}
          <div>
            <p className="field-label">Date & time</p>
            <p className="font-heading font-black text-ink text-lg leading-snug">
              {formatDate(ride.date)}
            </p>
            <p className="text-ink-soft text-sm mt-0.5">
              Starting at {formatTime(ride.date)}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-xl p-4"
              style={{ border: '2px solid var(--line)', backgroundColor: '#ffffff', boxShadow: '4px 4px 0px var(--line)' }}
            >
              <p className="field-label mb-1">Distance</p>
              <p className="font-heading font-black text-2xl text-ink">{ride.distance_km}</p>
              <p className="text-xs text-ink-soft font-medium">km</p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ border: '2px solid var(--line)', backgroundColor: '#ffffff', boxShadow: '4px 4px 0px var(--line)' }}
            >
              <p className="field-label mb-1">Elevation</p>
              <p className="font-heading font-black text-2xl text-ink">{ride.elevation_m}</p>
              <p className="text-xs text-ink-soft font-medium">m gain</p>
            </div>
          </div>

          {/* Surface */}
          <div>
            <p className="field-label">Surface</p>
            <p className="text-ink font-bold capitalize">{ride.surface}</p>
          </div>

          {/* Garmin / GPX export */}
          <div>
            <a
              href={`/clubs/${slug}/rides/${ride.id}/gpx`}
              download
              className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--amber)',
                border:          '2px solid var(--ink)',
                boxShadow:       '3px 3px 0px var(--ink)',
                color:           'var(--ink)',
                textDecoration:  'none',
              }}
            >
              ⬇ Download GPX
            </a>
            <p className="text-xs text-ink-soft mt-1.5">
              Import into Garmin Connect as a course.
            </p>
          </div>

          {isCaptain && (
            <div className="pt-2 space-y-2">
              <Link
                href={`/clubs/${slug}/rides/${ride.id}/edit`}
                className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'white',
                  border:          '2px solid var(--ink)',
                  boxShadow:       '3px 3px 0px var(--ink)',
                  color:           'var(--ink)',
                  textDecoration:  'none',
                }}
              >
                ✎ Edit route
              </Link>
              <DeleteRideButton rideId={ride.id} rideName={ride.name} slug={slug} />
            </div>
          )}

        </div>
      </div>

      {/* ══ Map ═════════════════════════════════════════════════════════════ */}
      <div className="flex-1 relative">
        <RideMapClient coordinates={ride.coordinates} />
      </div>

    </div>
  );
}
