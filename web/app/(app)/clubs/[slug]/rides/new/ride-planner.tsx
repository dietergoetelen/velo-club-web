'use client';

import { useState, useMemo, useTransition, useActionState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { generateRoutes, saveRide } from '@/lib/actions/rides';
import { upcomingOccurrences, findMatchingSchedule, DAY_NAMES_SHORT } from '@/lib/schedules';
import { RouteEditPanel } from '@/components/route-edit-panel';
import type { ClubSchedule, RideRoute } from '@/lib/types';

function MapLoading() {
  const t = useTranslations('common');
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <p className="text-ink-soft text-sm font-bold animate-pulse">{t('loadingMap')}</p>
    </div>
  );
}

const RouteMap = dynamic(() => import('./route-map'), {
  ssr:     false,
  loading: MapLoading,
});

type StartPos = { lat: number; lng: number };
type Step = 'setup' | 'generating' | 'picking' | 'editing';

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// ── Ride-name input ───────────────────────────────────────────────────────────
// Controlled input that auto-syncs to a suggested name until the captain types
// over it. Required because `defaultValue` only fires on initial mount, while
// `s.distance` keeps updating as RouteEditPanel recomputes.
function RideNameInput({ suggestion }: { suggestion: string }) {
  const [name, setName]    = useState(suggestion);
  const userEditedRef      = useRef(false);

  useEffect(() => {
    if (!userEditedRef.current) setName(suggestion);
  }, [suggestion]);

  return (
    <input
      name="name"
      type="text"
      required
      value={name}
      onChange={e => { userEditedRef.current = true; setName(e.target.value); }}
      className="field-input"
    />
  );
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
  const t = useTranslations('rides.create');
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
        {route.lollipopM > 0 && (
          <span
            className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full tabular-nums"
            title={t('pinchTitle', { m: route.lollipopM })}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--pink), white 75%)',
              border:          '1px solid var(--pink)',
              color:           'var(--ink)',
            }}
          >
            {t('pinch', { m: route.lollipopM })}
          </span>
        )}
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
  const t = useTranslations('rides.create');
  const [startPos, setStartPos] = useState<StartPos | null>(clubStart);
  // Mobile bottom-sheet state. Desktop ignores this entirely.
  // Initial: open if a start is already known (form is the next step);
  // collapsed otherwise (let the user see the map and tap to set start).
  const [sheetOpen, setSheetOpen] = useState<boolean>(!!clubStart);
  const prevStartRef = useRef<StartPos | null>(clubStart);
  useEffect(() => {
    // Auto-open the sheet the moment a start gets set from nothing —
    // the user just tapped the map and likely wants to continue setup.
    if (!prevStartRef.current && startPos) setSheetOpen(true);
    prevStartRef.current = startPos;
  }, [startPos]);

  // Swipe-to-toggle on the sheet handle: drag down to close, drag up to open.
  // |dy| < 30 px = treat as a tap and let onClick toggle instead.
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
    setSheetOpen(dy < 0);  // upward swipe → open, downward → close
  };
  const onSheetClick = () => {
    if (swipeHandledRef.current) { swipeHandledRef.current = false; return; }
    setSheetOpen(o => !o);
  };
  const [date, setDate]         = useState(tomorrow);
  const [time, setTime]         = useState('08:00');
  const [distance, setDistance] = useState(30);
  const [scheduleId, setScheduleId] = useState<string>('');

  const occurrences = useMemo(() => upcomingOccurrences(schedules, 7), [schedules]);

  const scheduleLabel = schedules.find(s => s.id === scheduleId)?.label.trim();

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
  const [profile, setProfile]             = useState<string>('racingbike');
  const [isOpenRoute, setIsOpenRoute]     = useState(false);

  const [isPending, startTransition] = useTransition();
  const [saveError, saveAction]      = useActionState(saveRide, null);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setStartPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => alert(t('geolocationFailed')),
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

  const handleCreate = () => {
    if (!startPos) return;
    // Open mode: route ends at the last waypoint, doesn't snap back to start.
    // Seed is just the start position; useRouteEdit returns empty segments
    // until the user adds their first waypoint.
    setRoutes([]);
    setSelectedRoute({
      id:          'a',
      label:       t('customLabel'),
      color:       '#FBBF24',
      distance:    0,
      elevation:   0,
      coordinates: [[startPos.lat, startPos.lng]],
      score:       100,
      lollipopM:   0,
    });
    setIsOpenRoute(true);
    setGenError(null);
    setStep('editing');
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

  const enterEdit = () => {
    if (!selectedRoute) return;
    setIsOpenRoute(false);
    setStep('editing');
  };
  const exitEdit  = () => {
    if (routes.length === 0) {
      setSelectedRoute(null);
      setStep('setup');
    } else {
      setStep('picking');
    }
  };

  const canGenerate = !!startPos && !isPending;

  // ── Edit mode early-return ─────────────────────────────────────────────────
  // RouteEditPanel hosts the segment-based useRouteEdit hook. Each entry
  // remounts it (via React's tree-diff on this branch), so state resets
  // cleanly when the captain re-picks a different route.
  if (step === 'editing' && selectedRoute && startPos) {
    return (
      <RouteEditPanel
        key={selectedRoute.id}
        start={startPos}
        initialPolyline={selectedRoute.coordinates}
        initialElevation={selectedRoute.elevation}
        profile={profile}
        open={isOpenRoute}
        header={
          <>
            <button
              type="button"
              onClick={exitEdit}
              className="eyebrow mb-3 inline-flex items-center gap-1.5 hover:text-accent transition-colors"
            >
              {t('backToRoutes')}
            </button>
            <h1 className="font-heading font-black text-2xl text-ink tracking-tight leading-tight">
              {t('editRouteTitle')}
            </h1>
          </>
        }
        saveSlot={s => (
          <form action={saveAction} className="space-y-4 pt-1">
            <input type="hidden" name="clubId"      value={clubId} />
            <input type="hidden" name="slug"        value={slug} />
            <input type="hidden" name="distanceKm"  value={s.distance} />
            <input type="hidden" name="elevationM"  value={s.elevation} />
            <input type="hidden" name="coordinates" value={JSON.stringify(s.polyline)} />
            <input type="hidden" name="date"        value={date} />
            <input type="hidden" name="time"        value={time} />
            <input type="hidden" name="scheduleId"  value={scheduleId} />

            {saveError && <p className="field-error">{saveError}</p>}

            <div>
              <label className="field-label">{t('rideNameLabel')}</label>
              <RideNameInput
                suggestion={`${scheduleLabel ? `${scheduleLabel} ` : ''}${selectedRoute.label} (${s.distance}km)`}
              />
            </div>

            <button type="submit" disabled={!s.canSave} className="btn-primary w-full">
              {t('saveRide')}
            </button>
          </form>
        )}
      />
    );
  }

  return (
    /* Fixed overlay below the nav — escapes max-w container entirely.
       Always flex; on mobile the panel is `position: fixed` so it pops
       out of flex flow and the map fills the row by itself. */
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

        {/* Header */}
        <div
          className="px-5 pt-1 pb-4 md:px-7 md:pt-7 md:pb-5 shrink-0"
          style={{ borderBottom: '2px solid var(--line)' }}
        >
          <Link
            href={`/clubs/${slug}`}
            className="eyebrow mb-3 inline-flex items-center gap-1.5 hover:text-accent transition-colors"
          >
            ← {clubName}
          </Link>
          <h1 className="font-heading font-black text-2xl text-ink tracking-tight leading-tight">
            {t('title')}
          </h1>
          <p className="text-ink-soft text-xs mt-1.5">
            {!startPos
              ? t('subtitleNoStart')
              : step === 'picking'
              ? t('subtitlePicking')
              : t('subtitleSetup')}
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 md:px-7 py-5 md:py-6 space-y-5">

          {/* ── Start position ── */}
          <div>
            <p className="field-label">{t('startLabel')}</p>
            {!startPos ? (
              <div className="flex gap-2">
                <div
                  className="flex-1 rounded-lg px-3 py-2.5 text-sm text-ink-soft font-medium"
                  style={{ border: '2px dashed var(--line)' }}
                >
                  {t('startPlaceholder')}
                </div>
                {clubStart ? (
                  <button
                    type="button"
                    onClick={() => setStartPos(clubStart)}
                    className="btn-secondary text-xs px-3 shrink-0"
                    title={t('useClubStartTitle')}
                  >
                    {t('useClubStart')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    className="btn-secondary text-xs px-3 shrink-0"
                    title={t('useMyLocationTitle')}
                  >
                    {t('useMyLocation')}
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
              <p className="field-label">{t('useSchedule')}</p>
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
                      {DAY_NAMES_SHORT[schedule.day_of_week]} · {schedule.time} · {schedule.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Date + time ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">{t('dateLabel')}</label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => {
                  const next = e.target.value;
                  setDate(next);
                  setScheduleId(findMatchingSchedule(schedules, next, time)?.id ?? '');
                }}
                disabled={isPending}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">{t('timeLabel')}</label>
              <input
                type="time"
                value={time}
                onChange={e => {
                  const next = e.target.value;
                  setTime(next);
                  setScheduleId(findMatchingSchedule(schedules, date, next)?.id ?? '');
                }}
                disabled={isPending}
                className="field-input"
              />
            </div>
          </div>

          {/* ── Distance slider ── */}
          <div>
            <label className="field-label">
              {t('distanceLabel')} —{' '}
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

          {/* ── Bike type ── */}
          <div>
            <label className="field-label">{t('bikeTypeLabel')}</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'racingbike',  icon: '🏁', label: t('bikeRace')   },
                { value: 'bike',        icon: '🚲', label: t('bikeCity')   },
                { value: 'bike_gravel', icon: '⛰️', label: t('bikeGravel') },
              ] as const).map(opt => {
                const isSelected = profile === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setProfile(opt.value)}
                    disabled={isPending}
                    className="flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all"
                    style={{
                      backgroundColor: isSelected ? 'var(--amber)' : 'white',
                      border:          '2px solid var(--ink)',
                      boxShadow:       isSelected ? '2px 2px 0px var(--ink)' : '2px 2px 0px var(--line)',
                      transform:       isSelected ? 'translate(-1px,-1px)' : 'none',
                      color:           'var(--ink)',
                    }}
                  >
                    <span className="text-xl leading-none">{opt.icon}</span>
                    <span className="text-xs font-bold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Generate error ── */}
          {genError && <p className="field-error">{genError}</p>}

          {/* ── Generate / Create buttons ── */}
          {step !== 'picking' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="btn-primary"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }}
                    />
                    {t('crunching')}
                  </span>
                ) : (
                  t('generate')
                )}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!startPos || isPending}
                className="btn-secondary"
              >
                {t('create')}
              </button>
            </div>
          )}

          {/* ── Route cards ── */}
          {step === 'picking' && (
            <>
              <div className="space-y-3">
                <p className="field-label">{t('pickRoute')}</p>
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
                  {isPending ? t('trying') : t('tryOther')}
                </button>
                <button
                  type="button"
                  onClick={enterEdit}
                  disabled={isPending || !selectedRoute}
                  className="btn-secondary text-sm"
                >
                  {t('editRoute')}
                </button>
              </div>
            </>
          )}

          {/* ── Save form (picking only — editing has its own in RouteEditPanel) */}
          {step === 'picking' && selectedRoute && (
            <form action={saveAction} className="space-y-4 pt-1">
              <input type="hidden" name="clubId"      value={clubId} />
              <input type="hidden" name="slug"        value={slug} />
              <input type="hidden" name="distanceKm"  value={selectedRoute.distance} />
              <input type="hidden" name="elevationM"  value={selectedRoute.elevation} />
              <input type="hidden" name="coordinates" value={JSON.stringify(selectedRoute.coordinates)} />
              <input type="hidden" name="date"        value={date} />
              <input type="hidden" name="time"        value={time} />
              <input type="hidden" name="scheduleId"  value={scheduleId} />

              {saveError && <p className="field-error">{saveError}</p>}

              <div>
                <label className="field-label">{t('rideNameLabel')}</label>
                <RideNameInput
                  suggestion={`${scheduleLabel ? `${scheduleLabel} ` : ''}${selectedRoute.label} (${selectedRoute.distance}km)`}
                />
              </div>

              <button type="submit" className="btn-primary w-full">
                {t('saveRide')}
              </button>
            </form>
          )}

        </div>
      </aside>

      {/* ══ Map ═════════════════════════════════════════════════════════════
           Mobile: the sheet is `fixed` so the map flex-item takes the whole
           row by itself. Desktop: same flex behaviour, sidebar to the left. */}
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
            {t('clickToStart')}
          </div>
        )}

        {/* Route legend — top-right on mobile (sheet covers bottom),
            bottom-right on desktop.                                   */}
        {routes.length > 0 && (
          <div
            className="absolute top-4 right-4 md:top-auto md:bottom-6 z-[1000] rounded-xl p-3 space-y-2"
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
