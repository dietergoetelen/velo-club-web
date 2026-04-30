'use client';

import { type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useRouteEdit } from '@/lib/route-edit';

const RouteMap = dynamic(
  () => import('@/app/(app)/clubs/[slug]/rides/new/route-map'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <p className="text-ink-soft text-sm font-bold animate-pulse">Loading map…</p>
      </div>
    ),
  },
);

export interface RouteEditState {
  distance:  number;
  elevation: number;
  polyline:  [number, number][];
  isPending: boolean;
  error:     string | null;
  canSave:   boolean;  // !isPending && !error && polyline.length > 0
}

/**
 * Shared edit-mode shell. Hosts the segment-based useRouteEdit hook, the
 * fixed split-screen layout, the waypoint list and the editable map.
 *
 * Callers supply:
 *   - `header`: top section of the sidebar (link/back-button + title).
 *   - `saveSlot`: the save form, given the live edit state so it can wire
 *      up hidden inputs and disable the submit while a recalc is pending.
 *   - `footer`: optional content shown below the save form.
 */
export function RouteEditPanel({
  start,
  initialPolyline,
  initialElevation,
  profile,
  header,
  saveSlot,
  footer,
}: {
  start:            { lat: number; lng: number };
  initialPolyline:  [number, number][];
  initialElevation: number;
  profile:          string;
  header:           ReactNode;
  saveSlot:         (s: RouteEditState) => ReactNode;
  footer?:          ReactNode;
}) {
  const edit = useRouteEdit({
    start,
    polyline:        initialPolyline,
    totalElevationM: initialElevation,
    profile,
  });

  const state: RouteEditState = {
    distance:  edit.distance,
    elevation: edit.elevation,
    polyline:  edit.polyline,
    isPending: edit.isPending,
    error:     edit.error,
    canSave:   !edit.isPending && !edit.error && edit.polyline.length > 0,
  };

  return (
    <div className="fixed inset-0 top-16 z-10 flex" style={{ backgroundColor: 'var(--paper)' }}>

      {/* ══ Left panel ══════════════════════════════════════════════════════ */}
      <div
        className="w-[400px] shrink-0 flex flex-col overflow-hidden"
        style={{ borderRight: '2px solid var(--ink)' }}
      >
        <div
          className="px-7 pt-7 pb-5 shrink-0"
          style={{ borderBottom: '2px solid var(--line)' }}
        >
          {header}
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-4">

          <div
            className="rounded-lg p-3 text-sm"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--amber), white 85%)',
              border:          '2px solid var(--amber)',
            }}
          >
            <p className="font-bold text-ink tabular-nums">
              {edit.distance} km · {edit.elevation} m ↑
              {edit.isPending && (
                <span className="ml-2 text-xs text-ink-soft font-normal">recalculating…</span>
              )}
            </p>
            <p className="text-xs text-ink-soft mt-1">
              Click the map to add a waypoint, drag a marker to move, click a marker to remove.
            </p>
          </div>

          {edit.error && <p className="field-error">{edit.error}</p>}

          {edit.waypoints.length > 0 && (
            <div className="space-y-1">
              {edit.waypoints.map((wp, i) => (
                <div
                  key={wp.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{ border: '2px solid var(--line)' }}
                >
                  <span
                    className="w-5 h-5 rounded-full font-black text-[11px] flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: 'var(--amber)',
                      border:          '2px solid var(--ink)',
                      color:           'var(--ink)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 tabular-nums text-ink-soft">
                    {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                  </span>
                  <button
                    type="button"
                    onClick={() => edit.deleteWaypoint(wp.id)}
                    className="text-ink-soft hover:text-ink font-black"
                    aria-label={`Remove waypoint ${i + 1}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {saveSlot(state)}
          {footer}
        </div>
      </div>

      {/* ══ Map ═════════════════════════════════════════════════════════════ */}
      <div className="flex-1 relative">
        <RouteMap
          startPos={start}
          routes={[]}
          selectedRouteId={null}
          onMapClick={() => { /* not used in edit mode */ }}
          onRouteSelect={() => { /* not used in edit mode */ }}
          editing
          waypoints={edit.waypoints}
          editPolyline={edit.polyline}
          onAddWaypoint={edit.addWaypoint}
          onMoveWaypoint={edit.moveWaypoint}
          onDeleteWaypoint={edit.deleteWaypoint}
        />
      </div>
    </div>
  );
}
