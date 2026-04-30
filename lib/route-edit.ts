// Shared helpers for the route-edit experience used by both the new-route
// planner and the ride-detail edit page.
//
// Model: the route is split into SEGMENTS between consecutive points in the
// list [start, w1, w2, …, wN, start]. On entry, segments are sliced from the
// original polyline so the loop is byte-identical to what was saved/picked.
// Only edited segments are re-routed via GraphHopper — unchanged ones stay
// exactly as they were.

'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { recalcSegment } from '@/lib/actions/rides';

export type Waypoint = {
  id:           string;
  lat:          number;
  lng:          number;
  polylineIdx:  number;   // sort key — closest index in the original polyline
};

export type Segment = {
  coordinates: [number, number][];   // [lat, lng][]
  distance:    number;                // km
  elevation:   number;                // m gain (approximation when sliced)
};

export const ANCHOR_COUNT = 10;

export function newWaypointId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function closestPolylineIndex(
  line: [number, number][],
  lat:  number,
  lng:  number,
): number {
  let best = 0;
  let bestD2 = Infinity;
  for (let i = 0; i < line.length; i++) {
    const dy = line[i][0] - lat;
    const dx = line[i][1] - lng;
    const d2 = dy * dy + dx * dx;
    if (d2 < bestD2) { bestD2 = d2; best = i; }
  }
  return best;
}

export function buildAnchors(polyline: [number, number][]): Waypoint[] {
  const out: Waypoint[] = [];
  if (polyline.length < 4) return out;
  const step = Math.floor(polyline.length / (ANCHOR_COUNT + 1));
  if (step < 1) return out;
  for (let i = 1; i <= ANCHOR_COUNT; i++) {
    const idx = i * step;
    if (idx <= 0 || idx >= polyline.length - 1) continue;
    const [lat, lng] = polyline[idx];
    out.push({ id: newWaypointId(), lat, lng, polylineIdx: idx });
  }
  return out;
}

function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2
          + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function polylineHaversineKm(line: [number, number][]): number {
  let m = 0;
  for (let i = 1; i < line.length; i++) m += haversineM(line[i - 1], line[i]);
  return m / 1000;
}

export function flattenSegments(segments: Segment[]): [number, number][] {
  if (segments.length === 0) return [];
  const out: [number, number][] = [...segments[0].coordinates];
  for (let i = 1; i < segments.length; i++) {
    out.push(...segments[i].coordinates.slice(1));
  }
  return out;
}

// Slice the original polyline at each anchor's polylineIdx to produce the
// initial segments, with elevation distributed proportional to (haversine)
// distance from the original total.
function buildInitialSegments({
  polyline,
  waypoints,
  totalElevationM,
}: {
  polyline:        [number, number][];
  waypoints:       Waypoint[];
  totalElevationM: number;
}): Segment[] {
  const sorted  = [...waypoints].sort((a, b) => a.polylineIdx - b.polylineIdx);
  const indices = [0, ...sorted.map(w => w.polylineIdx), polyline.length - 1];
  const segs:   Segment[] = [];
  for (let i = 0; i < indices.length - 1; i++) {
    const slice = polyline.slice(indices[i], indices[i + 1] + 1);
    segs.push({
      coordinates: slice,
      distance:    polylineHaversineKm(slice),
      elevation:   0,                    // filled below
    });
  }
  const totalDist = segs.reduce((a, s) => a + s.distance, 0) || 1;
  for (const s of segs) {
    s.elevation = totalElevationM * (s.distance / totalDist);
  }
  return segs;
}

export interface UseRouteEditArgs {
  start:           { lat: number; lng: number };
  polyline:        [number, number][];
  totalElevationM: number;
  profile:         string;
}

export interface UseRouteEdit {
  waypoints:       Waypoint[];      // ordered by polylineIdx
  polyline:        [number, number][]; // flattened from segments
  distance:        number;            // km, 1 decimal
  elevation:       number;            // m, integer
  isPending:       boolean;
  error:           string | null;
  addWaypoint:     (lat: number, lng: number) => void;
  moveWaypoint:    (id: string, lat: number, lng: number) => void;
  deleteWaypoint:  (id: string) => void;
}

/**
 * Stateful hook backing both the planner's edit mode and the ride-detail
 * edit page. Maintains segments + waypoints, only re-routes affected
 * segments on changes.
 */
export function useRouteEdit({
  start,
  polyline,
  totalElevationM,
  profile,
}: UseRouteEditArgs): UseRouteEdit {
  // Initial state — derived once from the inputs.
  const initial = useMemo(() => {
    const wps  = buildAnchors(polyline);
    const segs = buildInitialSegments({ polyline, waypoints: wps, totalElevationM });
    return { waypoints: wps, segments: segs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // intentionally only on mount; props are treated as initial values

  const [waypoints, setWaypoints] = useState<Waypoint[]>(initial.waypoints);
  const [segments,  setSegments]  = useState<Segment[]>(initial.segments);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Tracks an in-flight call's identity so stale responses can be discarded.
  const callSeq = useRef(0);

  // Recalc the segments at the given indices (multiple in parallel).
  // points[i] = the i-th point in [start, ...waypoints, start]
  // segIdx   = index of segments[] (segments[i] connects points[i] → points[i+1])
  const recalcAt = useCallback(async (
    pointsAtCall:   { lat: number; lng: number }[],
    segIndices:     number[],
  ) => {
    const seq = ++callSeq.current;
    setPendingCount(c => c + 1);
    setError(null);
    try {
      const results = await Promise.all(segIndices.map(i =>
        recalcSegment(pointsAtCall[i], pointsAtCall[i + 1], profile),
      ));
      if (seq !== callSeq.current) return;  // a newer call superseded this
      const failed = results.find(r => !r.ok);
      if (failed && !failed.ok) {
        setError(failed.error);
        return;
      }
      setSegments(prev => {
        const next = [...prev];
        for (let k = 0; k < segIndices.length; k++) {
          const r = results[k];
          if (!r.ok) continue;
          next[segIndices[k]] = {
            coordinates: r.coordinates,
            distance:    r.distance,
            elevation:   r.elevation,
          };
        }
        return next;
      });
    } finally {
      setPendingCount(c => Math.max(0, c - 1));
    }
  }, [profile]);

  const addWaypoint = useCallback((lat: number, lng: number) => {
    const polylineIdx = closestPolylineIndex(
      flattenSegments(segments),
      lat, lng,
    );
    const newWp: Waypoint = { id: newWaypointId(), lat, lng, polylineIdx };

    const sorted = [...waypoints].sort((a, b) => a.polylineIdx - b.polylineIdx);
    let insertAt = sorted.length;
    for (let i = 0; i < sorted.length; i++) {
      if (polylineIdx < sorted[i].polylineIdx) { insertAt = i; break; }
    }
    const nextWps = [...sorted.slice(0, insertAt), newWp, ...sorted.slice(insertAt)];

    // Approximate placeholders: split the old segment's polyline at the
    // closest point to the click so the visual roughly matches reality while
    // GH recalculates the two halves.
    const oldSeg = segments[insertAt] ?? { coordinates: [], distance: 0, elevation: 0 };
    const splitIdx = oldSeg.coordinates.length > 1
      ? closestPolylineIndex(oldSeg.coordinates, lat, lng)
      : 0;
    const ratioA = oldSeg.coordinates.length > 1 ? splitIdx / (oldSeg.coordinates.length - 1) : 0.5;
    const placeholderA: Segment = {
      coordinates: oldSeg.coordinates.slice(0, Math.max(splitIdx + 1, 1)),
      distance:    oldSeg.distance  * ratioA,
      elevation:   oldSeg.elevation * ratioA,
    };
    const placeholderB: Segment = {
      coordinates: oldSeg.coordinates.slice(splitIdx),
      distance:    oldSeg.distance  * (1 - ratioA),
      elevation:   oldSeg.elevation * (1 - ratioA),
    };
    const nextSegs = [
      ...segments.slice(0, insertAt),
      placeholderA,
      placeholderB,
      ...segments.slice(insertAt + 1),
    ];

    setWaypoints(nextWps);
    setSegments(nextSegs);

    const points = [start, ...nextWps, start];
    void recalcAt(points, [insertAt, insertAt + 1]);
  }, [waypoints, segments, start, recalcAt]);

  const moveWaypoint = useCallback((id: string, lat: number, lng: number) => {
    const idx = waypoints.findIndex(w => w.id === id);
    if (idx < 0) return;
    const flat = flattenSegments(segments);
    const polylineIdx = closestPolylineIndex(flat, lat, lng);
    const next = waypoints.map((w, i) => (i === idx ? { ...w, lat, lng, polylineIdx } : w));
    setWaypoints(next);

    const points = [start, ...next, start];
    // Adjacent segments to waypoint at index `idx` are segments[idx] and segments[idx+1]
    void recalcAt(points, [idx, idx + 1]);
  }, [waypoints, segments, start, recalcAt]);

  const deleteWaypoint = useCallback((id: string) => {
    const idx = waypoints.findIndex(w => w.id === id);
    if (idx < 0) return;
    const nextWps = waypoints.filter((_, i) => i !== idx);
    // Merge segments[idx] and segments[idx+1] into one placeholder.
    const placeholder = segments[idx] ?? { coordinates: [], distance: 0, elevation: 0 };
    const nextSegs = [
      ...segments.slice(0, idx),
      placeholder,
      ...segments.slice(idx + 2),
    ];
    setWaypoints(nextWps);
    setSegments(nextSegs);

    const points = [start, ...nextWps, start];
    void recalcAt(points, [idx]);
  }, [waypoints, segments, start, recalcAt]);

  const flatPolyline = useMemo(() => flattenSegments(segments), [segments]);
  const distance     = useMemo(
    () => Math.round(segments.reduce((a, s) => a + s.distance, 0) * 10) / 10,
    [segments],
  );
  const elevation    = useMemo(
    () => Math.round(segments.reduce((a, s) => a + s.elevation, 0)),
    [segments],
  );

  return {
    waypoints,
    polyline:       flatPolyline,
    distance,
    elevation,
    isPending:      pendingCount > 0,
    error,
    addWaypoint,
    moveWaypoint,
    deleteWaypoint,
  };
}
