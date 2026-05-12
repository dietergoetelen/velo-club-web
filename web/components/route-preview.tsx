/**
 * Static, non-interactive map preview for ride cards.
 *
 * Tiles (Carto Light, same provider as the detail page) and the route path
 * are rendered as siblings inside a single SVG, so they share the viewBox
 * coordinate system and scale together with the container.
 *
 * No client JS, no Leaflet — just <image> + <path>.
 */

const TILE_SIZE = 256;
const VIEW_W    = 800;    // viewBox aspect 2:1 — closer to typical loop bounds so the route fills the frame
const VIEW_H    = 400;
const PAD       = 20;     // route bounding box keeps this many viewBox px from the edges
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

// Largest zoom at which the bounds fit inside the viewBox minus padding.
function pickZoom(b: Bounds): number {
  const innerW = VIEW_W - PAD * 2;
  const innerH = VIEW_H - PAD * 2;
  for (let z = MAX_ZOOM; z >= 0; z--) {
    const w = lngToX(b.maxLng, z) - lngToX(b.minLng, z);
    const h = latToY(b.minLat, z) - latToY(b.maxLat, z);
    if (w <= innerW && h <= innerH) return z;
  }
  return 0;
}

function tileUrl(z: number, x: number, y: number): string {
  // Carto serves on subdomains a–d; pick deterministically to help browser caching.
  // @2x suffix = 512px retina tile, so the browser downscales instead of upscaling.
  const sub = 'abcd'[(x + y) % 4];
  return `https://${sub}.basemaps.cartocdn.com/light_all/${z}/${x}/${y}@2x.png`;
}

export function RoutePreview({
  coordinates,
  accent,
  className,
}: {
  coordinates: [number, number][];
  accent:      string;
  className?:  string;
}) {
  if (coordinates.length === 0) {
    return (
      <div
        className={className}
        style={{ backgroundColor: 'var(--muted)', aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
      />
    );
  }

  const bounds = getBounds(coordinates);
  const z      = pickZoom(bounds);

  // Center of the route in world pixels at chosen zoom.
  const worldCx = (lngToX(bounds.minLng, z) + lngToX(bounds.maxLng, z)) / 2;
  const worldCy = (latToY(bounds.minLat, z) + latToY(bounds.maxLat, z)) / 2;

  // Map world pixels → viewBox pixels: a point at (worldCx, worldCy) sits in
  // the middle of the viewBox.
  const originX = worldCx - VIEW_W / 2;
  const originY = worldCy - VIEW_H / 2;

  // Tile range that covers the viewBox.
  const minTileX = Math.floor(originX / TILE_SIZE);
  const maxTileX = Math.floor((originX + VIEW_W) / TILE_SIZE);
  const minTileY = Math.floor(originY / TILE_SIZE);
  const maxTileY = Math.floor((originY + VIEW_H) / TILE_SIZE);

  const tiles: { x: number; y: number; viewX: number; viewY: number }[] = [];
  const tileMax = Math.pow(2, z);
  for (let tx = minTileX; tx <= maxTileX; tx++) {
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      // Skip out-of-range tiles near the poles / edges.
      if (ty < 0 || ty >= tileMax) continue;
      // Wrap longitude.
      const wrappedX = ((tx % tileMax) + tileMax) % tileMax;
      tiles.push({
        x:     wrappedX,
        y:     ty,
        viewX: tx * TILE_SIZE - originX,
        viewY: ty * TILE_SIZE - originY,
      });
    }
  }

  // Project route to viewBox coordinates.
  let pathD = '';
  for (let i = 0; i < coordinates.length; i++) {
    const [lat, lng] = coordinates[i];
    const x = lngToX(lng, z) - originX;
    const y = latToY(lat, z) - originY;
    pathD += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  const first = pathD.match(/^M([\d.]+) ([\d.]+)/);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`route-preview-clip-${z}-${minTileX}-${minTileY}`}>
          <rect x="0" y="0" width={VIEW_W} height={VIEW_H} />
        </clipPath>
      </defs>

      <g clipPath={`url(#route-preview-clip-${z}-${minTileX}-${minTileY})`}>
        {tiles.map(t => (
          <image
            key={`${t.x}-${t.y}`}
            href={tileUrl(z, t.x, t.y)}
            x={t.viewX}
            y={t.viewY}
            width={TILE_SIZE}
            height={TILE_SIZE}
            preserveAspectRatio="none"
          />
        ))}

        <path
          d={pathD}
          fill="none"
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />
        {first && <circle cx={first[1]} cy={first[2]} r="3.5" fill="var(--ink)" />}
      </g>
    </svg>
  );
}
