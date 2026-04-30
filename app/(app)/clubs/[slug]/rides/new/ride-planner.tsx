'use client';

import { useState, useTransition, useActionState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { generateRoutes, saveRide } from '@/lib/actions/rides';
import type { RideRoute } from '@/lib/types';

const RouteMap = dynamic(() => import('./route-map'), {
  ssr:     false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <p className="text-ink-soft text-sm font-bold animate-pulse">Loading map…</p>
    </div>
  ),
});

type StartPos = { lat: number; lng: number };
type Step = 'setup' | 'generating' | 'picking';

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
      <div className="flex gap-4 text-sm">
        <span className="font-bold text-ink">{route.distance} km</span>
        <span className="text-ink-soft">{route.elevation} m ↑</span>
      </div>
    </button>
  );
}

// ── Main planner ──────────────────────────────────────────────────────────────

export function RidePlanner({
  clubId,
  slug,
  clubName,
}: {
  clubId:   string;
  slug:     string;
  clubName: string;
}) {
  const [startPos, setStartPos] = useState<StartPos | null>(null);
  const [date, setDate]         = useState(tomorrow);
  const [time, setTime]         = useState('08:00');
  const [distance, setDistance] = useState(30);

  const [routes, setRoutes]               = useState<RideRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RideRoute | null>(null);
  const [step, setStep]                   = useState<Step>('setup');
  const [genError, setGenError]           = useState<string | null>(null);

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
      const result = await generateRoutes(startPos.lat, startPos.lng, distance);
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
      const result = await generateRoutes(startPos.lat, startPos.lng, distance);
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
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  className="btn-secondary text-xs px-3 shrink-0"
                  title="Use my location"
                >
                  📍 My location
                </button>
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

          {/* ── Date + time ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Date</label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setDate(e.target.value)}
                disabled={isPending}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Start time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
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

              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isPending}
                className="btn-secondary w-full text-sm"
                style={{ opacity: isPending ? 0.5 : 1 }}
              >
                {isPending ? '↺ Finding better routes…' : '↺ Try different routes'}
              </button>
            </>
          )}

          {/* ── Save form ── */}
          {step === 'picking' && selectedRoute && (
            <form action={saveAction} className="space-y-4 pt-1">
              <input type="hidden" name="clubId"      value={clubId} />
              <input type="hidden" name="slug"        value={slug} />
              <input type="hidden" name="distanceKm"  value={selectedRoute.distance} />
              <input type="hidden" name="elevationM"  value={selectedRoute.elevation} />
              <input type="hidden" name="coordinates" value={JSON.stringify(selectedRoute.coordinates)} />
              <input type="hidden" name="date"        value={date} />
              <input type="hidden" name="time"        value={time} />

              {saveError && <p className="field-error">{saveError}</p>}

              <div>
                <label className="field-label">Ride name</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder={`Road ride · ${selectedRoute.distance} km`}
                  className="field-input"
                />
              </div>

              <button type="submit" className="btn-primary w-full">
                Save ride →
              </button>
            </form>
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
