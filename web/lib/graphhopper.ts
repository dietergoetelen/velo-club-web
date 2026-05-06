/**
 * Server-side GraphHopper client.
 * Never imported by client components — only by server actions / server components.
 */

import type { RideRoute } from '@/lib/types';

export type { RideRoute };

const GH_URL     = process.env.GRAPHHOPPER_URL     ?? 'http://localhost:8989';
const GH_PROFILE = process.env.GRAPHHOPPER_PROFILE ?? 'bike';

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
  { id: 'a', label: 'Northeast', color: '#8B5CF6', heading: 30  },
  { id: 'b', label: 'Southeast', color: '#F472B6', heading: 150 },
  { id: 'c', label: 'West',      color: '#34D399', heading: 270 },
];

// "100 or nothing" search.
// Per direction we fire BATCH_SIZE parallel candidates; if any has a clean
// (lollipopMeters === 0) result, we take it and stop. Otherwise we pause to
// avoid hammering GraphHopper, then fire another batch, up to MAX_BATCHES
// times. If no clean route emerges, the variant is dropped.
const BATCH_SIZE  = 10;
const MAX_BATCHES = 10;        // 10 × 10 = up to 100 attempts per heading
const PAUSE_MS    = 500;       // pause between batches

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  profile:    string,
): Promise<GHPath> {
  const qs = [
    `point=${lat},${lng}`,
    `profile=${profile}`,
    `ch.disable=true`,
    `lm.disable=true`,
    `algorithm=round_trip`,
    `round_trip.distance=${Math.round(distanceKm * 1000)}`,
    `round_trip.seed=${seed}`,
    `round_trip.points=5`,
    `heading=${heading}`,
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

// Haversine distance between two [lng, lat] points, in metres.
function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2
          + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Detects lollipops / pinch points: places where the route comes back close
 * to itself after riding a meaningful distance — without requiring the same
 * edges (so it catches parallel-road returns that the old grid-cell spurScore
 * missed).
 *
 * Returns the path-distance (m) of the largest detected pinch, or 0 if none.
 * Excludes the natural round-trip closure (start → end of full loop).
 */
function lollipopMeters(coords: [number, number][]): number {
  if (coords.length < 4) return 0;

  const PROXIMITY_M    = 25;   // route comes back within this spatial distance
  const MIN_PATH_GAP_M = 250;  // after riding at least this much along the path
  const CELL_M         = 35;   // grid cell size for fast spatial lookup
  const NATURAL_CLOSURE_RATIO = 0.90; // pinch ≥ 90% of total route = full loop

  // Cumulative path distance up to each point.
  const cum = new Float64Array(coords.length);
  for (let i = 1; i < coords.length; i++) {
    cum[i] = cum[i - 1] + haversineM(coords[i - 1], coords[i]);
  }
  const totalLen = cum[coords.length - 1];

  // Equirectangular meters-per-degree (good enough for Benelux extents).
  const lat0 = coords[0][1];
  const latScale = 111_320;                      // m per °lat
  const lngScale = 111_320 * Math.cos(lat0 * Math.PI / 180);

  const grid = new Map<string, number[]>();
  let maxPinch = 0;

  for (let i = 0; i < coords.length; i++) {
    const [lng, lat] = coords[i];
    const cy = Math.floor((lat * latScale) / CELL_M);
    const cx = Math.floor((lng * lngScale) / CELL_M);

    // Check 3×3 neighbour cells already populated by earlier points.
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const indices = grid.get(`${cy + dy},${cx + dx}`);
        if (!indices) continue;
        for (const j of indices) {
          const pinch = cum[i] - cum[j];
          if (pinch < MIN_PATH_GAP_M) continue;
          if (pinch > NATURAL_CLOSURE_RATIO * totalLen) continue;
          if (haversineM(coords[i], coords[j]) > PROXIMITY_M) continue;
          if (pinch > maxPinch) maxPinch = pinch;
        }
      }
    }

    const key = `${cy},${cx}`;
    const bucket = grid.get(key);
    if (bucket) bucket.push(i);
    else grid.set(key, [i]);
  }

  return maxPinch;
}

/**
 * Fetch CANDIDATES_PER_VARIANT routes for a given heading, return the cleanest one.
 * If all candidates fail, throws the last error.
 */
async function fetchClean(
  lat:        number,
  lng:        number,
  distanceKm: number,
  heading:    number,
  profile:    string,
): Promise<GHPath | null> {
  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    if (batch > 0) await sleep(PAUSE_MS);

    const results = await Promise.allSettled(
      Array.from({ length: BATCH_SIZE }, () =>
        fetchOne(lat, lng, distanceKm, randomSeed(), jitteredHeading(heading), profile),
      ),
    );

    const successes = results
      .filter((r): r is PromiseFulfilledResult<GHPath> => r.status === 'fulfilled')
      .map(r => r.value);

    // First clean (pinch === 0) candidate wins.
    for (const path of successes) {
      if (lollipopMeters(path.points.coordinates) === 0) {
        console.log(
          `[fetchClean heading=${heading}] CLEAN in batch ${batch + 1}/${MAX_BATCHES}`,
        );
        return path;
      }
    }

    const pinches = successes
      .map(p => `${Math.round(lollipopMeters(p.points.coordinates))}m`)
      .join(', ');
    console.log(
      `[fetchClean heading=${heading}] batch ${batch + 1}/${MAX_BATCHES}: ` +
      `${successes.length}/${BATCH_SIZE} ok, none clean — pinches: [${pinches}]`,
    );
  }

  console.log(`[fetchClean heading=${heading}] GAVE UP after ${MAX_BATCHES * BATCH_SIZE} attempts`);
  return null;
}

/**
 * Standard point-to-point routing through ordered via-points.
 * `points` are [lat, lng] in route order — for a closed loop pass the start
 * coord at both ends: [start, wp1, wp2, …, start].
 */
async function fetchViaRoute(
  points:  [number, number][],
  profile: string,
): Promise<GHPath> {
  const qs = [
    ...points.map(([lat, lng]) => `point=${lat},${lng}`),
    `profile=${profile}`,
    `ch.disable=true`,
    `lm.disable=true`,
    `points_encoded=false`,
    `instructions=false`,
  ].join('&');

  const res = await fetch(`${GH_URL}/route?${qs}`, { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let msg = `GraphHopper error (${res.status})`;
    try {
      const json = JSON.parse(body) as { message?: string };
      if (json.message) msg = json.message;
    } catch { /* raw text fallback */ }
    throw new Error(msg);
  }
  const data = await res.json() as GHResponse;
  if (!data.paths?.[0]) throw new Error('GraphHopper returned no path');
  return data.paths[0];
}

/** Single-segment routing A → B. Used for surgical edits that shouldn't
 *  perturb the rest of a route. */
export async function fetchSegment(
  from:    { lat: number; lng: number },
  to:      { lat: number; lng: number },
  profile: string = GH_PROFILE,
): Promise<{ distance: number; elevation: number; coordinates: [number, number][] }> {
  const path = await fetchViaRoute([[from.lat, from.lng], [to.lat, to.lng]], profile);
  return {
    distance:    path.distance / 1000,                  // km
    elevation:   path.ascend,                            // m
    coordinates: path.points.coordinates.map(([lo, la]) => [la, lo] as [number, number]),
  };
}

export async function fetchThreeRoutes(
  lat:        number,
  lng:        number,
  distanceKm: number,
  profile:    string = GH_PROFILE,
): Promise<RideRoute[]> {
  // Variants run in parallel; each does its own batched search.
  const paths = await Promise.all(
    VARIANTS.map(v => fetchClean(lat, lng, distanceKm, v.heading, profile)),
  );

  const routes: RideRoute[] = [];
  for (let i = 0; i < VARIANTS.length; i++) {
    const path = paths[i];
    if (!path) continue;  // variant gave up
    const v = VARIANTS[i];
    // GeoJSON is [lng, lat]; Leaflet needs [lat, lng]
    const coordinates = path.points.coordinates.map(
      ([lo, la]) => [la, lo] as [number, number],
    );
    routes.push({
      id:          v.id,
      label:       v.label,
      color:       v.color,
      distance:    Math.round(path.distance / 100) / 10,
      elevation:   Math.round(path.ascend),
      coordinates,
      score:       100,
      lollipopM:   0,
    });
  }

  if (routes.length === 0) {
    throw new Error(
      `Could not find any clean routes after ${MAX_BATCHES * BATCH_SIZE} attempts ` +
      'per direction. Try a different start point or distance.',
    );
  }

  return routes;
}
