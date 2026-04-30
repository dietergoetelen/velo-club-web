/**
 * Server-side GraphHopper client.
 * Never imported by client components — only by server actions / server components.
 */

import type { RideRoute } from '@/lib/types';

export type { RideRoute };

const GH_URL = process.env.GRAPHHOPPER_URL ?? 'http://localhost:8989';

type GHPath = {
  distance: number;   // metres
  ascend:   number;   // metres elevation gain
  points: {
    type:        'LineString';
    coordinates: [number, number][];  // GeoJSON [lng, lat]
  };
};

type GHResponse = {
  paths:    GHPath[];
  message?: string;
};

// 3 directions 120° apart — guarantees structural variety between routes
const VARIANTS: { id: RideRoute['id']; label: string; color: string; heading: number }[] = [
  { id: 'a', label: 'Route A', color: '#8B5CF6', heading: 30  },
  { id: 'b', label: 'Route B', color: '#F472B6', heading: 150 },
  { id: 'c', label: 'Route C', color: '#34D399', heading: 270 },
];

// Per-direction we fetch this many candidates and pick the cleanest one
const CANDIDATES_PER_VARIANT = 3;

function randomSeed() {
  return Math.floor(Math.random() * 1_000_000);
}

function jitteredHeading(base: number) {
  return (base + Math.round((Math.random() * 40) - 20) + 360) % 360;
}

async function fetchOne(
  lat:        number,
  lng:        number,
  distanceKm: number,
  seed:       number,
  heading:    number,
): Promise<GHPath> {
  const qs = [
    `point=${lat},${lng}`,
    `profile=bike`,
    `ch.disable=true`,
    `algorithm=round_trip`,
    `round_trip.distance=${Math.round(distanceKm * 1000)}`,
    `round_trip.seed=${seed}`,
    `round_trip.points=4`,
    `heading=${heading}`,
    `pass_through=true`,
    `points_encoded=false`,
    `instructions=false`,
  ].join('&');

  const res = await fetch(`${GH_URL}/route?${qs}`, { cache: 'no-store' });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let msg = `GraphHopper error (${res.status})`;
    try {
      const json = JSON.parse(body) as { message?: string };
      if (json.message?.includes('Could not find a valid point')) {
        msg = 'No roads found at this distance from your start. Try a shorter distance or a different starting point.';
      } else if (json.message) {
        msg = json.message;
      }
    } catch { /* raw text fallback */ }
    throw new Error(msg);
  }

  const data = (await res.json()) as GHResponse;
  if (!data.paths?.[0]) throw new Error('GraphHopper returned no path');

  return data.paths[0];
}

/**
 * Spur score: fraction of coordinate cells (≈11 m grid) visited more than once.
 * 0 = perfectly clean loop, higher = more backtracking.
 */
function spurScore(coords: [number, number][]): number {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const [lng, lat] of coords) {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (seen.has(key)) duplicates++;
    else seen.add(key);
  }
  return duplicates / Math.max(coords.length, 1);
}

/**
 * Fetch CANDIDATES_PER_VARIANT routes for a given heading, return the cleanest one.
 * If all candidates fail, throws the last error.
 */
async function fetchBest(
  lat:        number,
  lng:        number,
  distanceKm: number,
  heading:    number,
): Promise<GHPath> {
  const results = await Promise.allSettled(
    Array.from({ length: CANDIDATES_PER_VARIANT }, () =>
      fetchOne(lat, lng, distanceKm, randomSeed(), jitteredHeading(heading)),
    ),
  );

  const successes = results
    .filter((r): r is PromiseFulfilledResult<GHPath> => r.status === 'fulfilled')
    .map(r => r.value);

  if (successes.length === 0) {
    const firstError = results.find(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );
    throw new Error(firstError?.reason?.message ?? 'All route candidates failed');
  }

  // Pick the candidate with the fewest backtracked segments
  return successes.reduce((best, candidate) =>
    spurScore(candidate.points.coordinates) < spurScore(best.points.coordinates)
      ? candidate
      : best,
  );
}

export async function fetchThreeRoutes(
  lat:        number,
  lng:        number,
  distanceKm: number,
): Promise<RideRoute[]> {
  const results = await Promise.allSettled(
    VARIANTS.map(v => fetchBest(lat, lng, distanceKm, v.heading)),
  );

  const routes: RideRoute[] = [];
  for (let i = 0; i < VARIANTS.length; i++) {
    const result = results[i];
    if (result.status !== 'fulfilled') continue;
    const v = VARIANTS[i];
    // GeoJSON is [lng, lat]; Leaflet needs [lat, lng]
    const coordinates = result.value.points.coordinates.map(
      ([lo, la]) => [la, lo] as [number, number],
    );
    routes.push({
      id:          v.id,
      label:       v.label,
      color:       v.color,
      distance:    Math.round(result.value.distance / 100) / 10,
      elevation:   Math.round(result.value.ascend),
      coordinates,
    });
  }

  if (routes.length === 0) {
    const firstError = results.find(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );
    throw new Error(firstError?.reason?.message ?? 'No routes could be generated');
  }

  return routes;
}
