// Shared helpers for the route-edit experience used by both the new-route
// planner and the ride-detail edit page.
//
// Model: the route is just an ordered list of WAYPOINTS. The first waypoint
// IS the start — no separate "start" anchor. In closed mode the route loops
// back to waypoints[0] at the end; in open mode it ends at the last waypoint.
//
// Segments connect consecutive points in:
//   open   → waypoints
//   closed → [...waypoints, waypoints[0]]
//
// segments[i] connects points[i] → points[i+1]. On entry, segments are
// sliced from the original polyline so the loop is byte-identical to what
// was saved/picked. Only edited segments are re-routed via GraphHopper.

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

/**
 * Build waypoints from a multi-point polyline.
 *
 *   - waypoints[0] is always polyline[0] (the start anchor).
 *   - ANCHOR_COUNT intermediate anchors at evenly-spaced indices.
 *   - The final point (polyline[length-1]) is anchored explicitly. For
 *     closed polylines (e.g. generated loops) this coincides geographically
 *     with waypoints[0]; without this anchor, opening the route in the
 *     editor would silently truncate the return-to-start leg. For open
 *     polylines (manual routes) it coincides with the user's last placed
 *     waypoint, again so no tail polyline data is lost on re-edit.
 */
export function buildAnchors(polyline: [number, number][]): Waypoint[] {
  if (polyline.length < 1) return [];
  const out: Waypoint[] = [{
    id:          newWaypointId(),
    lat:         polyline[0][0],
    lng:         polyline[0][1],
    polylineIdx: 0,
  }];
  if (polyline.length < 2) return out;
  if (polyline.length >= 4) {
    const step = Math.floor(polyline.length / (ANCHOR_COUNT + 1));
    if (step >= 1) {
      for (let i = 1; i <= ANCHOR_COUNT; i++) {
        const idx = i * step;
        if (idx <= 0 || idx >= polyline.length - 1) continue;
        const [lat, lng] = polyline[idx];
        out.push({ id: newWaypointId(), lat, lng, polylineIdx: idx });
      }
    }
  }
  const lastIdx = polyline.length - 1;
  const [lat, lng] = polyline[lastIdx];
  out.push({ id: newWaypointId(), lat, lng, polylineIdx: lastIdx });
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

/**
 * Slice the original polyline at each waypoint's polylineIdx to produce the
 * initial segments. Elevation is distributed proportional to (haversine)
 * distance from the original total.
 *
 * Open mode:   segments = N-1 (between consecutive waypoints).
 * Closed mode: segments = N (last one closes back, using polyline[last] as
 *              the boundary — assumes the source polyline already closes).
 */
function buildInitialSegments({
  polyline,
  waypoints,
  totalElevationM,
  open,
}: {
  polyline:        [number, number][];
  waypoints:       Waypoint[];
  totalElevationM: number;
  open:            boolean;
}): Segment[] {
  if (waypoints.length < 2) return [];
  const sorted  = [...waypoints].sort((a, b) => a.polylineIdx - b.polylineIdx);
  const indices: number[] = sorted.map(w => w.polylineIdx);
  // In closed mode, ensure the closing slice index is present. buildAnchors
  // now always emits a waypoint at polyline.length-1, so the guard prevents
  // a duplicate (which would produce a zero-length last segment).
  if (!open) {
    const lastIdx = polyline.length - 1;
    if (indices[indices.length - 1] !== lastIdx) indices.push(lastIdx);
  }

  const segs: Segment[] = [];
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

// ── Adjacency helpers ────────────────────────────────────────────────────────

/**
 * Segment indices touching waypoint `idx` (the segments whose endpoints
 * include that waypoint). Used to know which segments need recalculation
 * after a move.
 */
function adjacentSegments(idx: number, total: number, open: boolean): number[] {
  if (total < 2) return [];
  const out = new Set<number>();
  // Outgoing — the segment that starts at wp[idx]
  if (idx < total - 1)      out.add(idx);
  else if (!open)           out.add(total - 1);    // closing segment (wp[N-1] → wp[0])
  // Incoming — the segment that ends at wp[idx]
  if (idx > 0)              out.add(idx - 1);
  else if (!open)           out.add(total - 1);    // closing segment, for wp[0]
  return [...out];
}

// ─────────────────────────────────────────────────────────────────────────────

export interface UseRouteEditArgs {
  polyline:        [number, number][];
  totalElevationM: number;
  profile:         string;
  /**
   * If true, the route is point-to-point (waypoints[0] → … → waypoints[N-1])
   * and does NOT close back to the start. Default false (closed loop).
   */
  open?:           boolean;
}

export interface UseRouteEdit {
  waypoints:        Waypoint[];      // ordered as visited; waypoints[0] is the start
  polyline:         [number, number][]; // flattened from segments
  distance:         number;            // km, 1 decimal
  elevation:        number;            // m, integer
  isPending:        boolean;
  error:            string | null;
  addWaypoint:      (lat: number, lng: number) => void;
  moveWaypoint:     (id: string, lat: number, lng: number) => void;
  deleteWaypoint:   (id: string) => void;
  reorderWaypoints: (fromIdx: number, toIdx: number) => void;
}

/**
 * Stateful hook backing both the planner's edit mode and the ride-detail
 * edit page. Maintains segments + waypoints, only re-routes affected
 * segments on changes.
 */
export function useRouteEdit({
  polyline,
  totalElevationM,
  profile,
  open = false,
}: UseRouteEditArgs): UseRouteEdit {
  // In open mode the polyline IS the waypoints visited in order. In closed
  // mode the polyline closes back to waypoints[0] for routing purposes —
  // GraphHopper sees `[...wps, wps[0]]`.
  const buildPoints = useCallback(
    (wps: { lat: number; lng: number }[]) => {
      if (wps.length === 0) return [];
      return open ? wps : [...wps, wps[0]];
    },
    [open],
  );

  // Initial state — derived once from the inputs.
  const initial = useMemo(() => {
    if (polyline.length === 0) {
      return { waypoints: [] as Waypoint[], segments: [] as Segment[] };
    }
    if (polyline.length === 1) {
      // Just a seed point — wp0 only, no segments yet.
      const wp0: Waypoint = {
        id:          newWaypointId(),
        lat:         polyline[0][0],
        lng:         polyline[0][1],
        polylineIdx: 0,
      };
      return { waypoints: [wp0], segments: [] as Segment[] };
    }
    const wps  = buildAnchors(polyline);
    const segs = buildInitialSegments({ polyline, waypoints: wps, totalElevationM, open });
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
  // pointsAtCall[i] is the i-th point in the route; segments[i] connects
  // pointsAtCall[i] → pointsAtCall[i+1].
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

    // ── First waypoint: becomes wp0, no segments yet ────────────────────────
    if (waypoints.length === 0) {
      setWaypoints([newWp]);
      setSegments([]);
      return;
    }

    // Open routes (drawing mode): always append in visit order.
    // Closed loops (refining a generated route): insert near the closest
    // existing segment — natural for "add a detour here".
    let baseList: Waypoint[];
    let insertAt: number;
    if (open) {
      baseList = waypoints;
      insertAt = waypoints.length;
    } else {
      baseList = [...waypoints].sort((a, b) => a.polylineIdx - b.polylineIdx);
      insertAt = baseList.length;
      for (let i = 0; i < baseList.length; i++) {
        if (polylineIdx < baseList[i].polylineIdx) { insertAt = i; break; }
      }
    }
    const nextWps = [...baseList.slice(0, insertAt), newWp, ...baseList.slice(insertAt)];
    const points  = buildPoints(nextWps);

    // ── Second waypoint (first segment ever) ────────────────────────────────
    if (waypoints.length === 1) {
      // Open: wp0 → newWp (one segment).
      // Closed: wp0 → newWp → wp0 (two segments — both routed equally).
      const newSegs: Segment[] = open
        ? [{
            coordinates: [[waypoints[0].lat, waypoints[0].lng], [lat, lng]],
            distance: 0, elevation: 0,
          }]
        : [
            {
              coordinates: [[waypoints[0].lat, waypoints[0].lng], [lat, lng]],
              distance: 0, elevation: 0,
            },
            {
              coordinates: [[lat, lng], [waypoints[0].lat, waypoints[0].lng]],
              distance: 0, elevation: 0,
            },
          ];
      setWaypoints(nextWps);
      setSegments(newSegs);
      void recalcAt(points, newSegs.map((_, i) => i));
      return;
    }

    // ── Open mode + append at end: extend the chain by one segment ──────────
    if (open && insertAt === waypoints.length) {
      const prev = waypoints[waypoints.length - 1];
      const newSeg: Segment = {
        coordinates: [[prev.lat, prev.lng], [lat, lng]],
        distance:    0,
        elevation:   0,
      };
      setWaypoints(nextWps);
      setSegments([...segments, newSeg]);
      void recalcAt(points, [segments.length]);
      return;
    }

    // ── Closed mode + interior insert: split segment[insertAt-1] in two ─────
    // (the segment between sortedWps[insertAt-1] and sortedWps[insertAt],
    //  or the closing segment when insertAt === waypoints.length).
    const oldSegIdx = insertAt - 1;
    const oldSeg = segments[oldSegIdx] ?? { coordinates: [], distance: 0, elevation: 0 };
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
      ...segments.slice(0, oldSegIdx),
      placeholderA,
      placeholderB,
      ...segments.slice(oldSegIdx + 1),
    ];

    setWaypoints(nextWps);
    setSegments(nextSegs);

    void recalcAt(points, [oldSegIdx, oldSegIdx + 1]);
  }, [waypoints, segments, recalcAt, buildPoints, open]);

  const moveWaypoint = useCallback((id: string, lat: number, lng: number) => {
    const idx = waypoints.findIndex(w => w.id === id);
    if (idx < 0) return;
    const flat = flattenSegments(segments);
    const polylineIdx = closestPolylineIndex(flat, lat, lng);
    const next = waypoints.map((w, i) => (i === idx ? { ...w, lat, lng, polylineIdx } : w));
    setWaypoints(next);

    const points = buildPoints(next);
    const adj    = adjacentSegments(idx, next.length, open);
    if (adj.length > 0) void recalcAt(points, adj);
  }, [waypoints, segments, recalcAt, buildPoints, open]);

  const deleteWaypoint = useCallback((id: string) => {
    const idx = waypoints.findIndex(w => w.id === id);
    if (idx < 0) return;
    const nextWps = waypoints.filter((_, i) => i !== idx);

    // Everything gone.
    if (nextWps.length === 0) {
      setWaypoints([]);
      setSegments([]);
      return;
    }

    // Only one waypoint left → no segments.
    if (nextWps.length === 1) {
      setWaypoints(nextWps);
      setSegments([]);
      return;
    }

    // ── Open mode + first wp removed: drop segment[0]; new wp0 is old wp1 ──
    if (open && idx === 0) {
      setWaypoints(nextWps);
      setSegments(segments.slice(1));
      return;
    }

    // ── Open mode + last wp removed: drop segment[N-2] (now N-1 wps → N-2 segs)
    if (open && idx === waypoints.length - 1) {
      setWaypoints(nextWps);
      setSegments(segments.slice(0, -1));
      return;
    }

    // ── Closed mode + first wp removed: the closing segment (wp[N-1] → wp[0])
    //    and segment[0] (wp[0] → wp[1]) collapse into a single placeholder
    //    wp[N-1] → wp[1], placed at the new last (closing) index.
    if (!open && idx === 0) {
      const prevWp = waypoints[waypoints.length - 1];   // last wp = will close to new wp0
      const nextWp = waypoints[1];                       // becomes the new wp0
      const placeholder: Segment = {
        coordinates: [[prevWp.lat, prevWp.lng], [nextWp.lat, nextWp.lng]],
        distance:    0,
        elevation:   0,
      };
      // Drop the old segment[0], keep middle segments, replace the old
      // closing segment with the placeholder.
      const middle = segments.slice(1, waypoints.length - 1);
      const nextSegs = [...middle, placeholder];
      setWaypoints(nextWps);
      setSegments(nextSegs);
      const points = buildPoints(nextWps);
      void recalcAt(points, [nextSegs.length - 1]);
      return;
    }

    // ── General case (closed middle, closed last, open middle):
    //    merge segment[idx-1] and segment[idx] into one placeholder.
    const prevWp = waypoints[idx - 1];
    const nextWp = waypoints[idx + 1] ?? waypoints[0];  // wrap in closed mode
    const placeholder: Segment = {
      coordinates: [[prevWp.lat, prevWp.lng], [nextWp.lat, nextWp.lng]],
      distance:    0,
      elevation:   0,
    };
    const nextSegs = [
      ...segments.slice(0, idx - 1),
      placeholder,
      ...segments.slice(idx + 1),
    ];
    setWaypoints(nextWps);
    setSegments(nextSegs);

    const points = buildPoints(nextWps);
    void recalcAt(points, [idx - 1]);
  }, [waypoints, segments, recalcAt, buildPoints, open]);

  const reorderWaypoints = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    if (fromIdx < 0 || fromIdx >= waypoints.length) return;
    if (toIdx   < 0 || toIdx   >= waypoints.length) return;

    const next = [...waypoints];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);

    // Re-stamp polylineIdx by visit order so addWaypoint's polylineIdx-sort
    // preserves this new arrangement. Real polylineIdx values get re-derived
    // by moveWaypoint/addWaypoint against the new flatPolyline next time.
    const reindexed = next.map((wp, i) => ({ ...wp, polylineIdx: i }));

    // Straight-line placeholder segments while GH recomputes everything.
    const pts = buildPoints(reindexed);
    const placeholders: Segment[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      placeholders.push({
        coordinates: [[pts[i].lat, pts[i].lng], [pts[i + 1].lat, pts[i + 1].lng]],
        distance:    0,
        elevation:   0,
      });
    }

    setWaypoints(reindexed);
    setSegments(placeholders);
    if (placeholders.length > 0) {
      void recalcAt(pts, placeholders.map((_, i) => i));
    }
  }, [waypoints, recalcAt, buildPoints]);

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
    reorderWaypoints,
  };
}
