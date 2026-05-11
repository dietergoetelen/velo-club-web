'use client';

import { useEffect, useMemo, useState } from 'react';
import { Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

type LatLng = [number, number];

type Props = {
  coordinates: LatLng[];
  /** Override the zoom-adaptive spacing with a fixed value (meters). */
  spacingMeters?: number;
  /** Hide arrows below this zoom level. */
  minZoom?: number;
  /** Arrow fill color. */
  color?: string;
  /** Arrow outline color (improves contrast over the polyline). */
  outline?: string;
};

function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function bearingDeg(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const dLng = toRad(b[1] - a[1]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

type Arrow = { lat: number; lng: number; bearing: number };

function computeArrows(coords: LatLng[], spacing: number): Arrow[] {
  const out: Arrow[] = [];
  if (coords.length < 2 || spacing <= 0) return out;

  let walked = 0;
  let nextAt = spacing;

  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const segLen = haversine(a, b);
    if (segLen === 0) continue;

    const brg = bearingDeg(a, b);

    while (walked + segLen >= nextAt) {
      const t = (nextAt - walked) / segLen;
      out.push({
        lat: a[0] + (b[0] - a[0]) * t,
        lng: a[1] + (b[1] - a[1]) * t,
        bearing: brg,
      });
      nextAt += spacing;
    }
    walked += segLen;
  }
  return out;
}

const ICON_CACHE = new Map<string, L.DivIcon>();

function arrowIcon(bearing: number, color: string, outline: string): L.DivIcon {
  // Snap to 5° buckets so we reuse icons across nearby positions.
  const snapped = Math.round(bearing / 5) * 5;
  const key = `${snapped}|${color}|${outline}`;
  const cached = ICON_CACHE.get(key);
  if (cached) return cached;

  const html = `<div style="
    width:16px;height:16px;
    pointer-events:none;
    display:flex;align-items:center;justify-content:center;
  ">
    <svg width="14" height="14" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"
         style="transform:rotate(${snapped}deg);transform-origin:center;opacity:0.95;">
      <path d="M10 3 L16 16.5 L10 13 L4 16.5 Z"
        fill="${color}"
        stroke="${outline}"
        stroke-width="1.5"
        stroke-linejoin="round"
        stroke-linecap="round" />
    </svg>
  </div>`;

  const icon = L.divIcon({
    className: '',
    html,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
  ICON_CACHE.set(key, icon);
  return icon;
}

export default function DirectionArrows({
  coordinates,
  spacingMeters,
  minZoom = 8,
  color = '#FBBF24',  // --amber
  outline = '#1E293B',  // --ink
}: Props) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    moveend: () => setZoom(map.getZoom()),
  });

  // Sibling BoundsFitter's fitBounds runs in its own useEffect and, when the
  // zoom delta exceeds Leaflet's zoomAnimationThreshold (4), fires zoomend
  // synchronously — before our useMapEvents listener subscribes. Re-read the
  // zoom once on mount so we don't render stale spacing until the first user
  // interaction.
  useEffect(() => {
    setZoom(map.getZoom());
  }, [map]);

  const spacing = useMemo(() => {
    if (spacingMeters !== undefined) return spacingMeters;
    // Aim for ~140 pixels between arrows on screen, regardless of zoom.
    const avgLat = coordinates.length > 0 ? coordinates[0][0] : 50;
    const mpp =
      (156543.03392 * Math.cos((avgLat * Math.PI) / 180)) / 2 ** zoom;
    return Math.max(150, 140 * mpp);
  }, [zoom, coordinates, spacingMeters]);

  const arrows = useMemo(
    () => computeArrows(coordinates, spacing),
    [coordinates, spacing],
  );

  if (zoom < minZoom || arrows.length === 0) return null;

  return (
    <>
      {arrows.map((a, i) => (
        <Marker
          key={i}
          position={[a.lat, a.lng]}
          icon={arrowIcon(a.bearing, color, outline)}
          interactive={false}
          keyboard={false}
        />
      ))}
    </>
  );
}
