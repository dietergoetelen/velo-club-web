'use client';

import { useState, useMemo, useEffect, useRef, useTransition, useActionState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { generateRoutes, saveRide, recalcEditedRoute } from '@/lib/actions/rides';
import { upcomingOccurrences, DAY_NAMES_SHORT } from '@/lib/schedules';
import type { ClubSchedule, RideRoute } from '@/lib/types';

type Waypoint = {
  id:           string;
  lat:          number;
  lng:          number;
  polylineIdx:  number;   // sort key — closest index in the picked route
};

const ANCHOR_COUNT = 10;  // initial waypoints sampled from the picked route

function newWaypointId(): string {
  return Math.random().toString(36).slice(2, 9);
}

// Find polyline index closest to a [lat, lng] point.
function closestPolylineIndex(line: [number, number][], lat: number, lng: number): number {
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

// Evenly-spaced initial waypoints sampled from a polyline. They keep the
// route shape stable when the user adds extra waypoints; the user is free to
// drag or remove them.
function buildAnchors(polyline: [number, number][]): Waypoint[] {
  const out: Waypoint[] = [];
  if (polyline.length < 4) return out;
  const step = Math.floor(polyline.length / (ANCHOR_COUNT + 1));
  if (step < 1) return out;
  for (let i = 1; i <= ANCHOR_COUNT; i++) {
    const idx = i * step;
    if (idx <= 0 || idx >= polyline.length - 1) continue;
    const [lat, lng] = polyline[idx];
    out.push({
      id:          newWaypointId(),
      lat, lng,
      polylineIdx: idx,
    });
  }
  return out;
}

const RouteMap = dynamic(() => import('./route-map'), {
  ssr:     false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <p className="text-ink-soft text-sm font-bold animate-pulse">Loading map…</p>
    </div>
  ),
});

type StartPos = { lat: number; lng: number };
type Step = 'setup' | 'generating' | 'picking' | 'editing';

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// ── Route card ────────────────────────────────────────────────────────────────

function RouteCard({
  route,
  selected,
  onClick,
}: {
  route:    RideRoute;
  selected: boolean;
  onClick:  () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left transition-all duration-200"
      style={{
        backgroundColor: '#ffffff',
        border:          `2px solid ${selected ? route.color : 'var(--line)'}`,
        borderRadius:    '12px',
        padding:         '14px 16px',
        boxShadow:       selected
          ? `4px 4px 0px ${route.color}`
          : '4px 4px 0px var(--line)',
        transform: selected ? 'translate(-1px,-1px)' : 'none',
      }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="w-3.5 h-3.5 rounded-full shrink-0"
          style={{ backgroundColor: route.color, border: '2px solid var(--ink)' }}
        />
        <span className="font-heading font-black text-ink text-sm">{route.label}</span>
        {selected && (
          <span
            className="ml-auto text-xs font-black px-2.5 py-0.5 rounded-full text-white"
            style={{ backgroundColor: route.color }}
          >
            ✓
          </span>
        )}
      </div>
      <div className="flex gap-4 text-sm items-center">
        <span className="font-bold text-ink">{route.distance} km</span>
        <span className="text-ink-soft">{route.elevation} m ↑</span>
        <span
          className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full tabular-nums"
          title={route.lollipopM === 0
            ? 'No pinch detected'
            : `Route folds within 25m of itself after ${route.lollipopM}m of riding`}
          style={{
            backgroundColor:
              route.score >= 90 ? 'color-mix(in srgb, var(--mint), white 75%)'
            : route.score >= 70 ? 'color-mix(in srgb, var(--amber), white 75%)'
                                : 'color-mix(in srgb, var(--pink), white 75%)',
            border:
              route.score >= 90 ? '1px solid var(--mint)'
            : route.score >= 70 ? '1px solid var(--amber)'
                                : '1px solid var(--pink)',
            color: 'var(--ink)',
          }}
        >
          {route.score} {route.lollipopM > 0 ? `· ${route.lollipopM}m pinch` : ''}
        </span>
      </div>
    </button>
  );
}

// ── Main planner ──────────────────────────────────────────────────────────────

export function RidePlanner({
  clubId,
  slug,
  clubName,
  schedules,
  clubStart,
}: {
  clubId:    string;
  slug:      string;
  clubName:  string;
  schedules: ClubSchedule[];
  clubStart: StartPos | null;
}) {
  const [startPos, setStartPos] = useState<StartPos | null>(clubStart);
  const [date, setDate]         = useState(tomorrow);
  const [time, setTime]         = useState('08:00');
  const [distance, setDistance] = useState(30);
  const [scheduleId, setScheduleId] = useState<string>('');

  const occurrences = useMemo(() => upcomingOccurrences(schedules, 7), [schedules]);

  const pickSchedule = (id: string, occurrenceDate: Date) => {
    if (scheduleId === id) {
      setScheduleId('');
      return;
    }
    setScheduleId(id);
    const yyyy = occurrenceDate.getFullYear();
    const mm   = String(occurrenceDate.getMonth() + 1).padStart(2, '0');
    const dd   = String(occurrenceDate.getDate()).padStart(2, '0');
    const hh   = String(occurrenceDate.getHours()).padStart(2, '0');
    const min  = String(occurrenceDate.getMinutes()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);
    setTime(`${hh}:${min}`);
  };

  const [routes, setRoutes]               = useState<RideRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RideRoute | null>(null);
  const [step, setStep]                   = useState<Step>('setup');
  const [genError, setGenError]           = useState<string | null>(null);
  const [profile, setProfile]             = useState<string>('bike');

  // Edit mode state
  const [waypoints, setWaypoints]   = useState<Waypoint[]>([]);
  const [originalPoly, setOriginalPoly] = useState<[number, number][]>([]);
  const [editPoly, setEditPoly]     = useState<[number, number][]>([]);
  const [editDist, setEditDist]     = useState<number>(0);
  const [editElev, setEditElev]     = useState<number>(0);
  const [editError, setEditError]   = useState<string | null>(null);
  const [editPending, setEditPending] = useState<boolean>(false);
  const recalcSeq = useRef(0);

  const orderedWaypoints = useMemo(
    () => [...waypoints].sort((a, b) => a.polylineIdx - b.polylineIdx),
    [waypoints],
  );

  const [isPending, startTransition] = useTransition();
  const [saveError, saveAction]      = useActionState(saveRide, null);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setStartPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => alert('Could not get your location. Click the map instead.'),
    );
  };

  const handleGenerate = () => {
    if (!startPos) return;
    setStep('generating');
    setGenError(null);
    startTransition(async () => {
      const result = await generateRoutes(startPos.lat, startPos.lng, distance, profile);
      if (result.ok) {
        setRoutes(result.routes);
        setSelectedRoute(result.routes[0]);
        setStep('picking');
      } else {
        setGenError(result.error);
        setStep('setup');
      }
    });
  };

  const handleRegenerate = () => {
    if (!startPos) return;
    setGenError(null);
    startTransition(async () => {
      const result = await generateRoutes(startPos.lat, startPos.lng, distance, profile);
      if (result.ok) {
        setRoutes(result.routes);
        setSelectedRoute(result.routes[0]);
      } else {
        setGenError(result.error);
      }
    });
  };

  const handleClearStart = () => {
    setStartPos(null);
    setRoutes([]);
    setSelectedRoute(null);
    setStep('setup');
    setGenError(null);
  };

  // ── Edit mode ──────────────────────────────────────────────────────────────

  const enterEdit = () => {
    if (!selectedRoute) return;
    setOriginalPoly(selectedRoute.coordinates);
    setEditPoly(selectedRoute.coordinates);
    setEditDist(selectedRoute.distance);
    setEditElev(selectedRoute.elevation);
    setWaypoints(buildAnchors(selectedRoute.coordinates));
    setEditError(null);
    setStep('editing');
  };

  const exitEdit = () => {
    setStep('picking');
    setWaypoints([]);
    setOriginalPoly([]);
    setEditError(null);
  };

  // Recalculate edited route whenever waypoints change.
  useEffect(() => {
    if (step !== 'editing' || !startPos) return;
    const seq = ++recalcSeq.current;
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;

      // Nothing to route through: revert to the picked round_trip polyline.
      if (orderedWaypoints.length === 0) {
        if (selectedRoute) {
          setEditPoly(selectedRoute.coordinates);
          setEditDist(selectedRoute.distance);
          setEditElev(selectedRoute.elevation);
        }
        setEditPending(false);
        setEditError(null);
        return;
      }

      setEditPending(true);
      setEditError(null);
      const result = await recalcEditedRoute(
        startPos,
        orderedWaypoints.map(({ lat, lng }) => ({ lat, lng })),
        profile,
      );
      if (cancelled || seq !== recalcSeq.current) return;
      setEditPending(false);
      if (result.ok) {
        setEditPoly(result.coordinates);
        setEditDist(result.distance);
        setEditElev(result.elevation);
      } else {
        setEditError(result.error);
      }
    })();
    return () => { cancelled = true; };
  }, [step, orderedWaypoints, startPos, profile, selectedRoute]);

  const addWaypoint = (lat: number, lng: number) => {
    if (!originalPoly.length) return;
    const polylineIdx = closestPolylineIndex(originalPoly, lat, lng);
    setWaypoints(prev => [
      ...prev,
      { id: newWaypointId(), lat, lng, polylineIdx },
    ]);
  };

  const moveWaypoint = (id: string, lat: number, lng: number) => {
    setWaypoints(prev => prev.map(w =>
      w.id === id
        ? { ...w, lat, lng, polylineIdx: closestPolylineIndex(originalPoly, lat, lng) }
        : w,
    ));
  };

  const deleteWaypoint = (id: string) => {
    setWaypoints(prev => prev.filter(w => w.id !== id));
  };

  const canGenerate = !!startPos && !isPending;

  return (
    /* Fixed overlay below the nav — escapes max-w container entirely */
    <div className="fixed inset-0 top-16 z-10 flex" style={{ backgroundColor: 'var(--paper)' }}>

      {/* ══ Left panel ══════════════════════════════════════════════════════ */}
      <div
        className="w-[400px] shrink-0 flex flex-col overflow-hidden"
        style={{ borderRight: '2px solid var(--ink)' }}
      >
        {/* Header */}
        <div
          className="px-7 pt-7 pb-5 shrink-0"
          style={{ borderBottom: '2px solid var(--line)' }}
        >
          <Link
            href={`/clubs/${slug}`}
            className="eyebrow mb-3 inline-flex items-center gap-1.5 hover:text-accent transition-colors"
          >
            ← {clubName}
          </Link>
          <h1 className="font-heading font-black text-2xl text-ink tracking-tight leading-tight">
            Plan a ride
          </h1>
          <p className="text-ink-soft text-xs mt-1.5">
            {!startPos
              ? 'Click the map to set your starting point.'
              : step === 'picking'
              ? 'Select a route, then give it a name.'
              : 'Fill in the details and generate routes.'}
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">

          {/* ── Start position ── */}
          <div>
            <p className="field-label">Start position</p>
            {!startPos ? (
              <div className="flex gap-2">
                <div
                  className="flex-1 rounded-lg px-3 py-2.5 text-sm text-ink-soft font-medium"
                  style={{ border: '2px dashed var(--line)' }}
                >
                  Click on the map →
                </div>
                {clubStart ? (
                  <button
                    type="button"
                    onClick={() => setStartPos(clubStart)}
                    className="btn-secondary text-xs px-3 shrink-0"
                    title="Use club's default start"
                  >
                    📍 Club start
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    className="btn-secondary text-xs px-3 shrink-0"
                    title="Use my location"
                  >
                    📍 My location
                  </button>
                )}
              </div>
            ) : (
              <div
                className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                style={{
                  border:          '2px solid var(--mint)',
                  backgroundColor: 'color-mix(in srgb, var(--mint), white 88%)',
                }}
              >
                <span className="text-sm font-bold text-ink flex-1 tabular-nums">
                  {startPos.lat.toFixed(5)}, {startPos.lng.toFixed(5)}
                </span>
                <button
                  type="button"
                  onClick={handleClearStart}
                  className="text-xs text-ink-soft hover:text-ink transition-colors font-black"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* ── Schedule picker ── */}
          {occurrences.length > 0 && (
            <div>
              <p className="field-label">Use schedule</p>
              <div className="flex flex-wrap gap-2">
                {occurrences.map(({ schedule, date: d }) => {
                  const isSelected = scheduleId === schedule.id;
                  return (
                    <button
                      key={schedule.id}
                      type="button"
                      onClick={() => pickSchedule(schedule.id, d)}
                      disabled={isPending}
                      className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                      style={{
                        backgroundColor: isSelected ? 'var(--amber)' : 'white',
                        border:          '2px solid var(--ink)',
                        boxShadow:       isSelected ? '2px 2px 0px var(--ink)' : '2px 2px 0px var(--line)',
                        transform:       isSelected ? 'translate(-1px,-1px)' : 'none',
                        color:           'var(--ink)',
                      }}
                    >
                      {DAY_NAMES_SHORT[d.getDay()]} {d.getDate()} {d.toLocaleString('en-GB', { month: 'short' })} · {schedule.time} · {schedule.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Date + time ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Date</label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => { setDate(e.target.value); setScheduleId(''); }}
                disabled={isPending}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Start time</label>
              <input
                type="time"
                value={time}
                onChange={e => { setTime(e.target.value); setScheduleId(''); }}
                disabled={isPending}
                className="field-input"
              />
            </div>
          </div>

          {/* ── Distance slider ── */}
          <div>
            <label className="field-label">
              Distance —{' '}
              <span
                className="font-black normal-case tracking-normal"
                style={{ color: 'var(--accent)' }}
              >
                {distance} km
              </span>
            </label>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={distance}
              onChange={e => setDistance(Number(e.target.value))}
              disabled={isPending}
              className="w-full mt-1"
              style={{ accentColor: 'var(--accent)', opacity: isPending ? 0.5 : 1 }}
            />
            <div className="flex justify-between text-xs text-ink-soft mt-0.5 font-medium">
              <span>10 km</span><span>120 km</span>
            </div>
          </div>

          {/* ── Routing engine (A/B test) ── */}
          <div>
            <label className="field-label">Routing engine</label>
            <select
              value={profile}
              onChange={e => setProfile(e.target.value)}
              disabled={isPending}
              className="field-input"
            >
              <option value="bike">bike — default</option>
              <option value="bike_road">bike_road — prefers paved</option>
              <option value="bike_gravel">bike_gravel — prefers gravel</option>
              <option value="road_bike">road_bike — custom + u_turn 60s</option>
              <option value="racingbike">racingbike — bundled racing</option>
              <option value="racingbike_avoid_turns">racingbike + avoid_turns</option>
            </select>
          </div>

          {/* ── Generate error ── */}
          {genError && <p className="field-error">{genError}</p>}

          {/* ── Generate button ── */}
          {step !== 'picking' && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="btn-primary w-full"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }}
                  />
                  Crunching routes…
                </span>
              ) : (
                '🗺 Generate routes'
              )}
            </button>
          )}

          {/* ── Route cards ── */}
          {step === 'picking' && (
            <>
              <div className="space-y-3">
                <p className="field-label">Pick a route</p>
                {routes.map(route => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    selected={selectedRoute?.id === route.id}
                    onClick={() => setSelectedRoute(route)}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isPending}
                  className="btn-secondary text-sm"
                  style={{ opacity: isPending ? 0.5 : 1 }}
                >
                  {isPending ? '↺ Trying…' : '↺ Try other'}
                </button>
                <button
                  type="button"
                  onClick={enterEdit}
                  disabled={isPending || !selectedRoute}
                  className="btn-secondary text-sm"
                >
                  ✎ Edit route
                </button>
              </div>
            </>
          )}

          {/* ── Edit mode ── */}
          {step === 'editing' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="field-label !mb-0">Editing route</p>
                <button
                  type="button"
                  onClick={exitEdit}
                  className="text-xs text-ink-soft hover:text-ink font-bold"
                >
                  ← Back
                </button>
              </div>

              <div
                className="rounded-lg p-3 text-sm"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--amber), white 85%)',
                  border:          '2px solid var(--amber)',
                }}
              >
                <p className="font-bold text-ink tabular-nums">
                  {editDist} km · {editElev} m ↑
                  {editPending && (
                    <span className="ml-2 text-xs text-ink-soft font-normal">recalculating…</span>
                  )}
                </p>
                <p className="text-xs text-ink-soft mt-1">
                  Click the route on the map to add a waypoint, drag a marker to move,
                  click a marker to remove.
                </p>
              </div>

              {editError && <p className="field-error">{editError}</p>}

              {orderedWaypoints.length > 0 && (
                <div className="space-y-1">
                  {orderedWaypoints.map((wp, i) => (
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
                        onClick={() => deleteWaypoint(wp.id)}
                        className="text-ink-soft hover:text-ink font-black"
                        aria-label={`Remove waypoint ${i + 1}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Save form (picking and editing share this) ── */}
          {(step === 'picking' || step === 'editing') && selectedRoute && (
            (() => {
              const useEdit = step === 'editing';
              const distance    = useEdit ? editDist : selectedRoute.distance;
              const elevation   = useEdit ? editElev : selectedRoute.elevation;
              const coordinates = useEdit ? editPoly : selectedRoute.coordinates;
              const canSave     = !useEdit || (!editPending && !editError && coordinates.length > 0);
              return (
                <form action={saveAction} className="space-y-4 pt-1">
                  <input type="hidden" name="clubId"      value={clubId} />
                  <input type="hidden" name="slug"        value={slug} />
                  <input type="hidden" name="distanceKm"  value={distance} />
                  <input type="hidden" name="elevationM"  value={elevation} />
                  <input type="hidden" name="coordinates" value={JSON.stringify(coordinates)} />
                  <input type="hidden" name="date"        value={date} />
                  <input type="hidden" name="time"        value={time} />
                  <input type="hidden" name="scheduleId"  value={scheduleId} />

                  {saveError && <p className="field-error">{saveError}</p>}

                  <div>
                    <label className="field-label">Ride name</label>
                    <input
                      name="name"
                      type="text"
                      required
                      placeholder={`Road ride · ${distance} km`}
                      className="field-input"
                    />
                  </div>

                  <button type="submit" disabled={!canSave} className="btn-primary w-full">
                    Save ride →
                  </button>
                </form>
              );
            })()
          )}

        </div>
      </div>

      {/* ══ Map ═════════════════════════════════════════════════════════════ */}
      <div className="flex-1 relative">
        <RouteMap
          startPos={startPos}
          routes={routes}
          selectedRouteId={selectedRoute?.id ?? null}
          onMapClick={setStartPos}
          onRouteSelect={setSelectedRoute}
          editing={step === 'editing'}
          waypoints={orderedWaypoints}
          editPolyline={editPoly}
          onAddWaypoint={addWaypoint}
          onMoveWaypoint={moveWaypoint}
          onDeleteWaypoint={deleteWaypoint}
        />

        {/* Pill instruction — only when no start has been set */}
        {!startPos && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]
                       px-5 py-2.5 rounded-full font-bold text-sm text-white
                       pointer-events-none select-none"
            style={{
              backgroundColor: 'var(--ink)',
              boxShadow:       '4px 4px 0px rgba(0,0,0,0.25)',
            }}
          >
            👆 Click anywhere to set your start
          </div>
        )}

        {/* Route legend — bottom right when routes are visible */}
        {routes.length > 0 && (
          <div
            className="absolute bottom-6 right-4 z-[1000] rounded-xl p-3 space-y-2"
            style={{
              backgroundColor: 'white',
              border:          '2px solid var(--ink)',
              boxShadow:       '4px 4px 0px var(--ink)',
            }}
          >
            {routes.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRoute(r)}
                className="flex items-center gap-2 text-xs font-bold text-ink transition-opacity"
                style={{ opacity: selectedRoute?.id === r.id ? 1 : 0.5 }}
              >
                <span
                  className="w-5 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: r.color }}
                />
                {r.label} · {r.distance} km
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
