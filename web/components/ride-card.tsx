import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AvatarStack, type StackedUser } from '@/components/avatar-stack';
import { RoutePreview } from '@/components/route-preview';
import { ReactionRow } from '@/components/reaction-row';
import type { ReactionEmoji, Route } from '@/lib/types';

const PALETTE = ['#FBBF24', '#F472B6', '#34D399', '#8B5CF6'] as const;

const LOCALE = 'nl-BE';

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export async function RideCard({
  ride,
  slug,
  index,
  scheduleLabel,
  attendees,
  reactionCounts,
  currentUserReaction,
  canReact,
}: {
  ride:                Route;
  slug:                string;
  index:               number;
  scheduleLabel?:      string;
  attendees:           StackedUser[];
  reactionCounts:      Record<ReactionEmoji, number>;
  currentUserReaction: ReactionEmoji | null;
  canReact:            boolean;
}) {
  const t = await getTranslations('rides.card');
  const accent = PALETTE[index % PALETTE.length];

  return (
    <article className="card overflow-hidden">
      <Link
        href={`/clubs/${slug}/rides/${ride.id}`}
        className="block group"
        style={{ textDecoration: 'none' }}
      >
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <h3 className="font-heading font-black text-ink text-xl leading-tight group-hover:text-accent transition-colors min-w-0">
            {ride.name}
          </h3>
          {scheduleLabel && (
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-black shrink-0"
              style={{
                backgroundColor: 'var(--amber)',
                border:          '2px solid var(--ink)',
                color:           'var(--ink)',
              }}
            >
              {scheduleLabel}
            </span>
          )}
        </div>

        {/* Stats row — tight inline group, left-aligned */}
        <dl className="flex flex-wrap gap-x-8 gap-y-2 px-5 mt-3">
          <Stat label={t('when')} value={formatDay(ride.date)} unit={formatTime(ride.date)} />
          <Stat label={t('distance')} value={`${ride.distance_km}`} unit={t('km')} />
          <Stat label={t('elevation')} value={`${ride.elevation_m}`} unit={t('m')} />
        </dl>

        {/* Map preview */}
        <div className="mt-3 px-5 pb-4">
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
            <RoutePreview coordinates={ride.coordinates} accent={accent} className="w-full h-auto block" />
          </div>
        </div>
      </Link>

      {/* Social row (outside Link so buttons are interactive) */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-3"
        style={{ borderTop: '2px solid var(--line)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {attendees.length > 0 ? (
            <>
              <AvatarStack users={attendees} size={28} visible={3} />
              <span className="text-xs font-black text-ink-soft tabular-nums shrink-0">
                {t('going', { count: attendees.length })}
              </span>
            </>
          ) : (
            <span className="text-xs text-ink-soft">{t('noOneYet')}</span>
          )}
        </div>
        <ReactionRow
          rideId={ride.id}
          slug={slug}
          counts={reactionCounts}
          currentUserReaction={currentUserReaction}
          disabled={!canReact}
        />
      </div>
    </article>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <dt className="text-[10px] font-black text-ink-soft uppercase tracking-wide">{label}</dt>
      <dd className="font-heading font-black text-ink text-base leading-tight">
        {value}
        {unit && <span className="font-bold text-xs text-ink-soft ml-1">{unit}</span>}
      </dd>
    </div>
  );
}
