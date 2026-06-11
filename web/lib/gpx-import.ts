// Client-side GPX parsing for route import. Uses the browser's DOMParser —
// only call this from client components.

export interface ParsedGpx {
  /** Route/track name from the file; '' when absent. */
  name:        string;
  coordinates: [number, number][];  // [lat, lng] — Leaflet order
  distanceKm:  number;              // 1 decimal
  elevationM:  number;              // integer, total ascent
}

// Recorded GPX files (1 trackpoint/second) easily reach 10k+ points; the
// planner and PB records work with ~1-2k. Distance/elevation are computed
// on the full track before thinning, so accuracy doesn't suffer.
const MAX_POINTS = 2000;

function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLng = (b[1] - a[1]) * Math.PI / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Total ascent from a (noisy) elevation profile: moving-average smoothing,
 *  then the sum of positive deltas. */
function totalAscentM(eles: number[]): number {
  if (eles.length < 2) return 0;
  const window = 5;
  const smooth = eles.map((_, i) => {
    const from = Math.max(0, i - Math.floor(window / 2));
    const to   = Math.min(eles.length, from + window);
    let sum = 0;
    for (let j = from; j < to; j++) sum += eles[j];
    return sum / (to - from);
  });
  let gain = 0;
  for (let i = 1; i < smooth.length; i++) {
    const d = smooth[i] - smooth[i - 1];
    if (d > 0) gain += d;
  }
  return Math.round(gain);
}

/**
 * Parse a GPX document into route data. Reads `<trkpt>` points (all
 * segments, in document order), falling back to `<rtept>` for route-only
 * files. Returns null when the file isn't valid GPX or has fewer than two
 * points.
 */
export function parseGpx(xml: string): ParsedGpx | null {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return null;

  // getElementsByTagNameNS('*', …) matches by local name, so files with or
  // without the GPX namespace both work.
  let pts = doc.getElementsByTagNameNS('*', 'trkpt');
  if (pts.length === 0) pts = doc.getElementsByTagNameNS('*', 'rtept');
  if (pts.length < 2) return null;

  const coordinates: [number, number][] = [];
  const elevations:  number[] = [];
  let hasEle = true;

  for (const pt of pts) {
    const lat = parseFloat(pt.getAttribute('lat') ?? '');
    const lng = parseFloat(pt.getAttribute('lon') ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    coordinates.push([lat, lng]);

    const ele = parseFloat(pt.getElementsByTagNameNS('*', 'ele')[0]?.textContent ?? '');
    if (Number.isFinite(ele)) elevations.push(ele);
    else hasEle = false;
  }
  if (coordinates.length < 2) return null;

  let distanceM = 0;
  for (let i = 1; i < coordinates.length; i++) {
    distanceM += haversineM(coordinates[i - 1], coordinates[i]);
  }

  // Thin to MAX_POINTS by uniform stride, always keeping the final point.
  let thinned = coordinates;
  if (coordinates.length > MAX_POINTS) {
    const stride = Math.ceil(coordinates.length / MAX_POINTS);
    thinned = coordinates.filter((_, i) => i % stride === 0);
    const last = coordinates[coordinates.length - 1];
    if (thinned[thinned.length - 1] !== last) thinned.push(last);
  }

  const trk  = doc.getElementsByTagNameNS('*', 'trk')[0]
            ?? doc.getElementsByTagNameNS('*', 'rte')[0]
            ?? doc.getElementsByTagNameNS('*', 'metadata')[0];
  const name = trk?.getElementsByTagNameNS('*', 'name')[0]?.textContent?.trim() ?? '';

  return {
    name,
    coordinates: thinned,
    distanceKm:  Math.round(distanceM / 100) / 10,
    elevationM:  hasEle ? totalAscentM(elevations) : 0,
  };
}
