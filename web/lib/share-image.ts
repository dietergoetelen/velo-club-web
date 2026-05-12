/**
 * Composes a route map as a single SVG data URI suitable for embedding
 * inside next/og's ImageResponse JSX.
 *
 *   - Carto Light tiles, same provider as the live map.
 *   - Tiles are fetched server-side and inlined as base64 PNGs so Satori
 *     doesn't have to chase external URLs at render time.
 *   - Route polyline is rendered as <path> in the same SVG viewBox.
 */

const TILE_SIZE = 256;
const MAX_ZOOM  = 17;

interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

function getBounds(coords: [number, number][]): Bounds {
  let minLat =  Infinity, maxLat = -Infinity;
  let minLng =  Infinity, maxLng = -Infinity;
  for (const [lat, lng] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}

// Web Mercator → world pixel coordinates at a given zoom.
function lngToX(lng: number, z: number): number {
  return ((lng + 180) / 360) * Math.pow(2, z) * TILE_SIZE;
}
function latToY(lat: number, z: number): number {
  const rad = lat * Math.PI / 180;
  return ((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * Math.pow(2, z) * TILE_SIZE;
}

function pickZoom(b: Bounds, viewW: number, viewH: number, pad: number): number {
  const innerW = viewW - pad * 2;
  const innerH = viewH - pad * 2;
  for (let z = MAX_ZOOM; z >= 0; z--) {
    const w = lngToX(b.maxLng, z) - lngToX(b.minLng, z);
    const h = latToY(b.minLat, z) - latToY(b.maxLat, z);
    if (w <= innerW && h <= innerH) return z;
  }
  return 0;
}

async function fetchTileDataUri(z: number, x: number, y: number): Promise<string | null> {
  const sub = 'abcd'[(x + y) % 4];
  const url = `https://${sub}.basemaps.cartocdn.com/light_all/${z}/${x}/${y}@2x.png`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return 'data:image/png;base64,' + buf.toString('base64');
  } catch {
    return null;
  }
}

/**
 * Build a square map SVG with the route drawn over Carto tiles. Returns a
 * data URI usable as `<img src>` inside an ImageResponse.
 *
 * @param coords      route polyline, `[lat, lng][]`
 * @param viewSize    SVG width/height in px; the SVG is square
 * @param accent      route stroke color (hex)
 */
export async function renderRouteMapDataUri(
  coords:   [number, number][],
  viewSize: number = 960,
  accent:   string = '#FBBF24',
): Promise<string | null> {
  if (coords.length < 2) return null;

  const VIEW_W = viewSize;
  const VIEW_H = viewSize;
  const PAD    = Math.round(viewSize * 0.05);

  const bounds = getBounds(coords);
  const z      = pickZoom(bounds, VIEW_W, VIEW_H, PAD);

  const worldCx = (lngToX(bounds.minLng, z) + lngToX(bounds.maxLng, z)) / 2;
  const worldCy = (latToY(bounds.minLat, z) + latToY(bounds.maxLat, z)) / 2;

  const originX = worldCx - VIEW_W / 2;
  const originY = worldCy - VIEW_H / 2;

  const minTileX = Math.floor(originX / TILE_SIZE);
  const maxTileX = Math.floor((originX + VIEW_W) / TILE_SIZE);
  const minTileY = Math.floor(originY / TILE_SIZE);
  const maxTileY = Math.floor((originY + VIEW_H) / TILE_SIZE);

  const tileMax = Math.pow(2, z);
  type T = { x: number; y: number; viewX: number; viewY: number; dataUri: string };
  const tilePlans: { x: number; y: number; viewX: number; viewY: number }[] = [];
  for (let tx = minTileX; tx <= maxTileX; tx++) {
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      if (ty < 0 || ty >= tileMax) continue;
      const wrappedX = ((tx % tileMax) + tileMax) % tileMax;
      tilePlans.push({
        x:     wrappedX,
        y:     ty,
        viewX: tx * TILE_SIZE - originX,
        viewY: ty * TILE_SIZE - originY,
      });
    }
  }

  const tiles: T[] = (await Promise.all(
    tilePlans.map(async p => {
      const dataUri = await fetchTileDataUri(z, p.x, p.y);
      return dataUri ? { ...p, dataUri } : null;
    }),
  )).filter((t): t is T => t !== null);

  // Project route polyline into viewBox coords.
  let pathD = '';
  for (let i = 0; i < coords.length; i++) {
    const [lat, lng] = coords[i];
    const x = lngToX(lng, z) - originX;
    const y = latToY(lat, z) - originY;
    pathD += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  const first = pathD.match(/^M([\d.]+) ([\d.]+)/);

  const tilesXml = tiles.map(t =>
    `<image href="${t.dataUri}" x="${t.viewX.toFixed(1)}" y="${t.viewY.toFixed(1)}" ` +
    `width="${TILE_SIZE}" height="${TILE_SIZE}" preserveAspectRatio="none"/>`,
  ).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="xMidYMid slice">`
    + `<defs><clipPath id="c"><rect x="0" y="0" width="${VIEW_W}" height="${VIEW_H}"/></clipPath></defs>`
    + `<g clip-path="url(#c)">`
    +   tilesXml
    +   `<path d="${pathD}" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`
    +   (first ? `<circle cx="${first[1]}" cy="${first[2]}" r="10" fill="#1E293B"/>` : '')
    + `</g></svg>`;

  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}
