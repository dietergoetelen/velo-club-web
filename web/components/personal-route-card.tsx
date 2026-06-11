import Link from 'next/link';
import { RoutePreview } from '@/components/route-preview';
import type { PersonalRoute } from '@/lib/types';

const PALETTE = ['#FBBF24', '#F472B6', '#34D399', '#8B5CF6'] as const;

/**
 * Dashboard card for a personal route. Mirrors the visual anatomy of
 * `RideCard` (title → stats → map preview) but pared down — no date, no
 * attendees, no reactions. Designed to sit in a 3-column grid.
 */
export function PersonalRouteCard({
  route,
  index,
  ownerName,
}: {
  route:      PersonalRoute;
  index:      number;
  /** Byline for shared contexts (e.g. the club routes tab); omitted on the
      owner's own dashboard. */
  ownerName?: string;
}) {
  const accent = PALETTE[index % PALETTE.length];

  return (
    <Link
      href={`/routes/${route.id}`}
      className="card overflow-hidden block group"
      style={{ textDecoration: 'none' }}
    >
      <div className="px-5 pt-5">
        <h3 className="font-heading font-black text-ink text-lg leading-tight group-hover:text-accent transition-colors truncate">
          {route.name}
        </h3>
        {ownerName && (
          <p className="text-xs text-ink-soft font-medium mt-0.5 truncate">door {ownerName}</p>
        )}

        <dl className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
          <Stat label="AFSTAND" value={`${route.distance_km}`} unit="km" />
          <Stat label="HOOGTE"  value={`${route.elevation_m}`} unit="m ↑" />
        </dl>
      </div>

      <div className="mt-3 px-5 pb-4">
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
          <RoutePreview
            coordinates={route.coordinates}
            accent={accent}
            className="w-full h-auto block"
          />
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <dt className="text-[10px] font-black text-ink-soft uppercase tracking-wide">{label}</dt>
      <dd className="font-heading font-black text-ink text-base leading-tight">
        {value}
        <span className="font-bold text-xs text-ink-soft ml-1">{unit}</span>
      </dd>
    </div>
  );
}
