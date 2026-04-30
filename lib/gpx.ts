function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isoSeconds(date: string): string {
  // Garmin's importer dislikes fractional seconds: "2026-05-03T09:00:00Z"
  return new Date(date).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Build a GPX 1.1 track. Format is what Garmin Connect's course import
 * accepts: full namespace + schemaLocation, an <ele> on each point
 * (placeholder 0 — we don't store per-point elevation), plain open/close tags.
 *
 * Coordinates are [lat, lng] pairs (Leaflet order).
 */
export function buildGpx({
  name,
  date,
  coordinates,
}: {
  name:        string;
  date:        string;  // ISO date
  coordinates: [number, number][];
}): string {
  const safeName = escapeXml(name);
  const time     = isoSeconds(date);

  const points = coordinates
    .map(([lat, lng]) =>
      `      <trkpt lat="${lat}" lon="${lng}"><ele>0</ele></trkpt>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="vnext" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${safeName}</name>
    <time>${time}</time>
  </metadata>
  <trk>
    <name>${safeName}</name>
    <type>cycling</type>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
}

export function gpxFilename(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${slug || 'ride'}.gpx`;
}
