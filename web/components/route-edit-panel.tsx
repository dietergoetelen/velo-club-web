'use client';

import { type ReactNode, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useRouteEdit } from '@/lib/route-edit';

function MapLoading() {
  const t = useTranslations('common');
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <p className="text-ink-soft text-sm font-bold animate-pulse">{t('loadingMap')}</p>
    </div>
  );
}

const RouteMap = dynamic(
  () => import('@/app/(app)/clubs/[slug]/rides/new/route-map'),
  {
    ssr: false,
    loading: MapLoading,
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
  open,
  header,
  saveSlot,
  footer,
}: {
  start:            { lat: number; lng: number };
  initialPolyline:  [number, number][];
  initialElevation: number;
  profile:          string;
  open?:            boolean;
  header:           ReactNode;
  saveSlot:         (s: RouteEditState) => ReactNode;
  footer?:          ReactNode;
}) {
  const t = useTranslations('routeEdit');
  const edit = useRouteEdit({
    start,
    polyline:        initialPolyline,
    totalElevationM: initialElevation,
    profile,
    open,
  });

  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  // Mobile bottom-sheet open/peek state — desktop ignores it.
  const [sheetOpen, setSheetOpen] = useState<boolean>(true);

  // Swipe-to-toggle on the sheet handle: drag down to close, drag up to open.
  const swipeStartYRef  = useRef<number | null>(null);
  const swipeHandledRef = useRef<boolean>(false);
  const onSheetTouchStart = (e: React.TouchEvent) => {
    swipeStartYRef.current  = e.touches[0].clientY;
    swipeHandledRef.current = false;
  };
  const onSheetTouchEnd = (e: React.TouchEvent) => {
    const start = swipeStartYRef.current;
    swipeStartYRef.current = null;
    if (start === null) return;
    const dy = e.changedTouches[0].clientY - start;
    if (Math.abs(dy) < 30) return;
    swipeHandledRef.current = true;
    setSheetOpen(dy < 0);
  };
  const onSheetClick = () => {
    if (swipeHandledRef.current) { swipeHandledRef.current = false; return; }
    setSheetOpen(o => !o);
  };

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

      {/* ══ Left panel / bottom sheet ═══════════════════════════════════════ */}
      <aside
        className={`
          flex flex-col overflow-hidden bg-white
          fixed inset-x-0 bottom-0 z-[1100] rounded-t-2xl
          border-t-2 border-ink shadow-[0_-4px_0_var(--ink)]
          transition-[height] duration-300 ease-out
          ${sheetOpen ? 'h-[85vh]' : 'h-[150px]'}
          md:relative md:inset-auto md:z-auto md:rounded-none md:shadow-none
          md:w-[400px] md:shrink-0 md:h-full md:bg-paper
          md:border-t-0 md:border-r-2
        `}
      >
        {/* Drag handle — mobile only. Tap toggles peek/expanded;
            swipe up/down moves between states.                        */}
        <button
          type="button"
          onClick={onSheetClick}
          onTouchStart={onSheetTouchStart}
          onTouchEnd={onSheetTouchEnd}
          aria-label={sheetOpen ? t('collapsePanel') : t('expandPanel')}
          className="md:hidden shrink-0 w-full flex flex-col items-center gap-1 pt-2 pb-1.5"
        >
          <span
            className="block w-12 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--ink-soft)', opacity: 0.5 }}
          />
          <span
            className="text-[11px] font-bold tracking-wide select-none"
            style={{ color: 'var(--ink-soft)' }}
          >
            {sheetOpen ? `▾ ${t('tapForMap')}` : `▴ ${t('tapForDetails')}`}
          </span>
        </button>

        <div
          className="px-5 pt-1 pb-4 md:px-7 md:pt-7 md:pb-5 shrink-0"
          style={{ borderBottom: '2px solid var(--line)' }}
        >
          {header}
        </div>

        <div className="flex-1 overflow-y-auto px-5 md:px-7 py-5 md:py-6 space-y-4">

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
                <span className="ml-2 text-xs text-ink-soft font-normal">{t('recalculating')}</span>
              )}
            </p>
            <p className="text-xs text-ink-soft mt-1">
              {t('hint')}
            </p>
          </div>

          {edit.error && <p className="field-error">{edit.error}</p>}

          {edit.waypoints.length > 0 && (
            <div className="space-y-1">
              {edit.waypoints.map((wp, i) => {
                const isDragging = dragFrom === i;
                const isDropTgt  = dragOver === i && dragFrom !== null && dragFrom !== i;
                return (
                  <div
                    key={wp.id}
                    draggable
                    onDragStart={e => {
                      setDragFrom(i);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnter={() => setDragOver(i)}
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                    onDrop={e => {
                      e.preventDefault();
                      if (dragFrom !== null && dragFrom !== i) edit.reorderWaypoints(dragFrom, i);
                      setDragFrom(null);
                      setDragOver(null);
                    }}
                    onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                    style={{
                      border:    `2px solid ${isDropTgt ? 'var(--accent)' : 'var(--line)'}`,
                      opacity:   isDragging ? 0.4 : 1,
                      cursor:    'grab',
                    }}
                  >
                    <span className="text-ink-soft select-none" aria-hidden="true">⋮⋮</span>
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
                      className="text-ink-soft hover:text-ink hover:bg-[var(--line)] font-black px-2.5 py-1 -mr-1 rounded leading-none text-base"
                      aria-label={t('removeWaypointAria', { n: i + 1 })}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {saveSlot(state)}
          {footer}
        </div>
      </aside>

      {/* ══ Map ═════════════════════════════════════════════════════════════
           Mobile: the sheet is `fixed` so this flex-item fills the row.   */}
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
