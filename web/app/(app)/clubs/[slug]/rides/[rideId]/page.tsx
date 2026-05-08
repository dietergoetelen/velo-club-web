import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { toggleAttendance } from '@/lib/actions/attendance';
import { AvatarStack, type StackedUser } from '@/components/avatar-stack';
import type { Attendance, Club, ClubMember, Route } from '@/lib/types';
import RideMapClient from './ride-map-client';
import { DeleteRideButton } from './delete-ride-button';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-BE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('nl-BE', {
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

  const t = await getTranslations('rides.detail');

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

  const myMembership = await pb.collection('club_members')
    .getFirstListItem<ClubMember>(`club = "${club.id}" && user = "${user.id}"`)
    .catch(() => null);
  const isMember  = !!myMembership;
  const isCaptain = myMembership?.role === 'captain';

  const attendances = await pb.collection('attendances').getFullList<Attendance>({
    filter: `route = "${ride.id}"`,
  }).catch(() => []);

  const attendees: StackedUser[] = (await Promise.all(
    attendances.map(async a => {
      const u = await pb.collection('users').getOne(a.user).catch(() => null);
      if (!u) return null;
      const name = (u['name'] as string) || (u['username'] as string) || (u['email'] as string);
      return {
        id:     a.user,
        name,
        avatar: ((u['avatar'] as string) ?? '') as string,
      };
    }),
  )).filter((u): u is StackedUser => u !== null);

  const isAttending = attendances.some(a => a.user === user.id);

  return (
    <div
      className="
        md:fixed md:inset-0 md:top-16 md:z-10
        md:grid md:grid-cols-[380px_1fr] md:grid-rows-[auto_1fr]
      "
      style={{ backgroundColor: 'var(--paper)' }}
    >

      {/* ══ Title ══════════════════════════════════════════════════════════
           Mobile: top of page. Desktop: top of left column.                */}
      <div
        className="pb-5 md:px-7 md:pt-7 md:col-start-1 md:row-start-1 md:shrink-0"
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

      {/* ══ Map ═══════════════════════════════════════════════════════════
           Mobile: full-bleed, fixed height. Desktop: right column, full height. */}
      <div
        className="
          relative
          -mx-6 md:mx-0 my-6 md:my-0
          h-[55vh] md:h-auto
          md:col-start-2 md:row-start-1 md:row-end-3
          border-y-2 md:border-y-0 md:border-l-2 border-ink
        "
      >
        <RideMapClient coordinates={ride.coordinates} />
      </div>

      {/* ══ Details ═══════════════════════════════════════════════════════
           Mobile: below the map. Desktop: scrollable left column body.     */}
      <div
        className="
          space-y-6 pb-4
          md:col-start-1 md:row-start-2 md:overflow-y-auto md:px-7 md:py-6 md:pb-6
        "
      >

        {/* Date & time */}
        <div>
          <p className="field-label">{t('dateTimeLabel')}</p>
          <p className="font-heading font-black text-ink text-lg leading-snug">
            {formatDate(ride.date)}
          </p>
          <p className="text-ink-soft text-sm mt-0.5">
            {t('startingAt', { time: formatTime(ride.date) })}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-4"
            style={{ border: '2px solid var(--line)', backgroundColor: '#ffffff', boxShadow: '4px 4px 0px var(--line)' }}
          >
            <p className="field-label mb-1">{t('distance')}</p>
            <p className="font-heading font-black text-2xl text-ink">{ride.distance_km}</p>
            <p className="text-xs text-ink-soft font-medium">{t('distanceUnit')}</p>
          </div>
          <div
            className="rounded-xl p-4"
            style={{ border: '2px solid var(--line)', backgroundColor: '#ffffff', boxShadow: '4px 4px 0px var(--line)' }}
          >
            <p className="field-label mb-1">{t('elevation')}</p>
            <p className="font-heading font-black text-2xl text-ink">{ride.elevation_m}</p>
            <p className="text-xs text-ink-soft font-medium">{t('elevationUnit')}</p>
          </div>
        </div>

        {/* Surface */}
        <div>
          <p className="field-label">{t('surface')}</p>
          <p className="text-ink font-bold capitalize">{ride.surface}</p>
        </div>

        {/* Attendance */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <p className="field-label mb-0">{t('going')}</p>
            <span className="text-xs font-black text-ink-soft tabular-nums">
              {attendees.length}
            </span>
          </div>
          {attendees.length > 0 ? (
            <AvatarStack users={attendees} size={36} visible={3} />
          ) : (
            <p className="text-ink-soft text-sm">{t('noOneYet')}</p>
          )}
          {isMember && (
            <form action={toggleAttendance} className="mt-4">
              <input type="hidden" name="rideId" value={ride.id} />
              <input type="hidden" name="slug"   value={slug} />
              <button
                type="submit"
                className={isAttending ? 'btn-secondary w-full' : 'btn-primary w-full'}
              >
                {isAttending ? t('imIn') : t('imJoining')}
              </button>
            </form>
          )}
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
            {t('downloadGpx')}
          </a>
          <p className="text-xs text-ink-soft mt-1.5">
            {t('gpxHint')}
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
              {t('editRoute')}
            </Link>
            <DeleteRideButton rideId={ride.id} rideName={ride.name} slug={slug} />
          </div>
        )}

      </div>

    </div>
  );
}
