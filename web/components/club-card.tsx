import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { toggleAttendance } from '@/lib/actions/attendance';
import { markdownToPreview } from '@/lib/markdown';
import { AvatarStack } from '@/components/avatar-stack';
import type { Club, ClubMember } from '@/lib/types';
import type { NextRide } from '@/lib/next-ride';

const ACCENT_COLORS = ['#FBBF24', '#F472B6', '#34D399', '#8B5CF6'] as const;
const LOCALE        = 'nl-BE';

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Dashboard club tile — one per club, no duplication. Top: club identity.
 * Middle: the club's next ride with a one-tap RSVP (where the reminder push
 * lands). Bottom: into the club. The whole card is no longer a single link,
 * so the ride link and RSVP form can be interactive inside it.
 */
export async function ClubCard({
  club,
  role,
  index,
  next,
}: {
  club:  Club;
  role:  ClubMember['role'] | undefined;
  index: number;
  next:  NextRide | null;
}) {
  const t      = await getTranslations('dashboard');
  const tNext  = await getTranslations('nextRide');
  const tCard  = await getTranslations('rides.card');

  return (
    <article className="card p-6 flex flex-col">
      {/* Colored accent ball */}
      <div
        className="w-11 h-11 rounded-full mb-4 shrink-0"
        style={{
          backgroundColor: ACCENT_COLORS[index % ACCENT_COLORS.length],
          border:    '2px solid var(--ink)',
          boxShadow: '3px 3px 0px var(--ink)',
        }}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3 mb-2">
        <Link
          href={`/clubs/${club.slug}`}
          className="font-heading font-black text-lg text-ink leading-snug hover:text-accent transition-colors duration-200"
          style={{ textDecoration: 'none' }}
        >
          {club.name}
        </Link>
        {role === 'captain'
          ? <span className="badge-brand shrink-0">{t('captainBadge')}</span>
          : <span className="badge-neutral shrink-0">{t('memberBadge')}</span>}
      </div>

      {club.description && (
        <p className="text-sm text-ink-soft line-clamp-2">{markdownToPreview(club.description)}</p>
      )}

      {/* Next ride + one-tap RSVP */}
      {next ? (
        <div className="mt-5 pt-5" style={{ borderTop: '2px solid var(--line)' }}>
          <p className="eyebrow mb-2">{tNext('label')}</p>
          <Link
            href={`/clubs/${club.slug}/rides/${next.ride.id}`}
            className="font-heading font-black text-ink text-base leading-tight hover:text-accent transition-colors duration-200 block"
            style={{ textDecoration: 'none' }}
          >
            {next.ride.name}
          </Link>
          <p className="text-sm text-ink-soft mt-1 tabular-nums">
            {formatDay(next.ride.date)} · {formatTime(next.ride.date)} · {next.ride.distance_km} {tCard('km')}
          </p>

          <div className="flex items-center gap-2.5 min-w-0 mt-3 mb-3">
            {next.attendees.length > 0 ? (
              <>
                <AvatarStack users={next.attendees} size={28} visible={4} />
                <span className="text-xs font-black text-ink-soft tabular-nums shrink-0">
                  {tCard('going', { count: next.attendees.length })}
                </span>
              </>
            ) : (
              <span className="text-xs text-ink-soft">{tCard('noOneYet')}</span>
            )}
          </div>

          <form action={toggleAttendance}>
            <input type="hidden" name="rideId" value={next.ride.id} />
            <input type="hidden" name="slug"   value={club.slug} />
            <button type="submit" className={next.isAttending ? 'btn-secondary w-full' : 'btn-primary w-full'}>
              {next.isAttending ? tNext('joined') : tNext('join')}
            </button>
          </form>
        </div>
      ) : (
        <p className="mt-5 pt-5 text-sm text-ink-soft" style={{ borderTop: '2px solid var(--line)' }}>
          {tNext('none')}
        </p>
      )}

      <Link
        href={`/clubs/${club.slug}`}
        className="mt-5 block text-xs font-black text-ink-soft hover:text-accent transition-colors duration-200 uppercase tracking-wide"
        style={{ textDecoration: 'none' }}
      >
        {t('viewClub')}
      </Link>
    </article>
  );
}
