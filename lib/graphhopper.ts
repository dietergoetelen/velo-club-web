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
  message?: string;  // present on error
};

const VARIANTS: { id: RideRoute['id']; label: string; color: string }[] = [
  { id: 'a', label: 'Route A', color: '#8B5CF6' },
  { id: 'b', label: 'Route B', color: '#F472B6' },
  { id: 'c', label: 'Route C', color: '#34D399' },
];

async function fetchOne(
  lat:        number,
  lng:        number,
  distanceKm: number,
  seed:       number,
): Promise<GHPath> {
  const qs = [
    `point=${lat},${lng}`,
    `profile=bike_road`,
    `algorithm=round_trip`,
    `round_trip.distance=${Math.round(distanceKm * 1000)}`,
    `round_trip.seed=${seed}`,
    `round_trip.num_points=2`,
    `points_encoded=false`,
    `instructions=false`,
  ].join('&');
  const url = `${GH_URL}/route?${qs}`;

  const res = await fetch(url, { cache: 'no-store' });

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

export async function fetchThreeRoutes(
  lat:        number,
  lng:        number,
  distanceKm: number,
): Promise<RideRoute[]> {
  const paths = await Promise.all(
    VARIANTS.map(v => fetchOne(lat, lng, distanceKm, Math.floor(Math.random() * 1_000_000))),
  );

  return paths.map((path, i) => {
    const v = VARIANTS[i];
    // GeoJSON is [lng, lat]; Leaflet needs [lat, lng]
    const coordinates = path.points.coordinates.map(
      ([lo, la]) => [la, lo] as [number, number],
    );
    return {
      id:          v.id,
      label:       v.label,
      color:       v.color,
      distance:    Math.round(path.distance / 100) / 10,
      elevation:   Math.round(path.ascend),
      coordinates,
    };
  });
}
