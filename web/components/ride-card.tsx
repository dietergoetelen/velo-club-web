import Link from 'next/link';
import { AvatarStack, type StackedUser } from '@/components/avatar-stack';
import type { Route } from '@/lib/types';

const PALETTE = ['#FBBF24', '#F472B6', '#34D399', '#8B5CF6'] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-BE', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('nl-BE', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export function RideCard({
  ride,
  slug,
  index,
  scheduleLabel,
  attendees,
}: {
  ride:           Route;
  slug:           string;
  index:          number;
  scheduleLabel?: string;
  attendees:      StackedUser[];
}) {
  return (
    <Link
      href={`/clubs/${slug}/rides/${ride.id}`}
      className="card p-5 flex items-center gap-5 card-link"
      style={{ textDecoration: 'none' }}
    >
      <div
        className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center font-heading font-black text-lg"
        style={{
          backgroundColor: PALETTE[index % PALETTE.length],
          border:    '2px solid var(--ink)',
          boxShadow: '3px 3px 0px var(--ink)',
          color:     'var(--ink)',
        }}
        aria-hidden="true"
      >
        🚴
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-heading font-black text-ink text-base leading-snug truncate flex items-center gap-2">
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
          <span className="truncate">{ride.name}</span>
        </p>
        <p className="text-ink-soft text-sm mt-0.5">
          {formatDate(ride.date)} · {formatTime(ride.date)} · {ride.distance_km} km · {ride.elevation_m} m ↑
        </p>
      </div>

      {attendees.length > 0 && (
        <div className="shrink-0 flex items-center gap-2.5">
          <AvatarStack users={attendees} size={30} />
          <span className="text-xs font-black text-ink-soft tabular-nums">
            {attendees.length}
          </span>
        </div>
      )}

    </Link>
  );
}
