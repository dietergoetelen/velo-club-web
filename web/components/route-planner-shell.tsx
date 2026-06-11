'use client';

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { generateRoutes } from '@/lib/actions/rides';
import { parseGpx } from '@/lib/gpx-import';
import { RouteEditPanel, type RouteEditState } from '@/components/route-edit-panel';
import { LibraryPickerDialog } from '@/components/library-picker-dialog';
import type { LibraryEntry } from '@/lib/actions/route-library';
import type { RideRoute } from '@/lib/types';

type StartPos = { lat: number; lng: number };
type Mode     = 'loop' | 'manual' | 'library' | 'gpx';
type Step     = 'mode' | 'setup' | 'generating' | 'picking' | 'editing';

function MapLoading() {
  const t = useTranslations('common');
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <p className="text-ink-soft text-sm font-bold animate-pulse">{t('loadingMap')}</p>
    </div>
  );
}

// The planner's map (Leaflet + tiles + click-to-set-start) lives co-located
// with the legacy ride planner. Imported dynamically because Leaflet is
// client-only.
const RouteMap = dynamic(
  () => import('@/app/(app)/clubs/[slug]/rides/new/route-map'),
  { ssr: false, loading: MapLoading },
);

// ─────────────────────────────────────────────────────────────────────────────
// Slot state types

export type PlannerStep = Step;
export type PlannerMode = Mode;

export interface PlannerEditorSlotState extends RouteEditState {
  route: RideRoute;
}

export interface RoutePlannerShellProps {
  /** Back link shown only on the mode-picker step (e.g. "← Club name" or
   *  "← Dashboard"). Other steps render an internal "← Andere planmethode"
   *  button. */
  modeBackLink: ReactNode;

  /** Optional fields rendered between Bike type and the Generate CTA in the
   *  setup view (loop mode). Used by clubs for date/time/schedule chips. */
  setupExtras?: ReactNode;

  /** Save form rendered below the 3 generated route cards (loop-mode
   *  picking step). Receives the currently selected route. */
  pickingSaveSlot: (route: RideRoute) => ReactNode;

  /** Save form rendered inside RouteEditPanel during the editing step.
   *  Receives RouteEditPanel's live state plus the selected route. */
  editorSaveSlot: (state: PlannerEditorSlotState) => ReactNode;

  /** Club default start. When set, used as the "📍 Clubstart" shortcut
   *  and as the map's initial center. */
  clubStart?: StartPos | null;

  /** Enable the "📚 Uit bibliotheek" mode card. Personal-route library is
   *  loaded for the given club (members' routes are surfaced first). */
  libraryClubId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small UI helpers used internally

function ModeCard({
  emoji,
  title,
  description,
  onClick,
}: {
  emoji:       string;
  title:       string;
  description: string;
  onClick:     () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 flex items-start gap-4 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
      style={{
        backgroundColor: 'white',
        border:          '2px solid var(--ink)',
        boxShadow:       '4px 4px 0px var(--ink)',
      }}
    >
      <span className="text-2xl leading-none mt-0.5" aria-hidden>{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-heading font-black text-ink text-base leading-tight">{title}</p>
        <p className="text-xs text-ink-soft mt-1">{description}</p>
      </div>
    </button>
  );
}

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

// ─────────────────────────────────────────────────────────────────────────────

export function RoutePlannerShell({
  modeBackLink,
  setupExtras,
  pickingSaveSlot,
  editorSaveSlot,
  clubStart      = null,
  libraryClubId,
}: RoutePlannerShellProps) {
  const t = useTranslations('rides.create');

  // ── State ──────────────────────────────────────────────────────────────
  const [startPos,      setStartPos]      = useState<StartPos | null>(null);
  const [routes,        setRoutes]        = useState<RideRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RideRoute | null>(null);
  const [mode,          setMode]          = useState<Mode | null>(null);
  const [step,          setStep]          = useState<Step>('mode');
  const [genError,      setGenError]      = useState<string | null>(null);
  const [profile,       setProfile]       = useState<string>('racingbike');
  const [distance,      setDistance]      = useState(30);

  // Mobile bottom-sheet state.
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);
  const prevStartRef = useRef<StartPos | null>(null);
  useEffect(() => {
    if (!prevStartRef.current && startPos) setSheetOpen(true);
    prevStartRef.current = startPos;
  }, [startPos]);

  // Swipe-to-toggle on the sheet handle.
  const swipeStartYRef  = useRef<number | null>(null);
  const swipeHandledRef = useRef<boolean>(false);
  const onSheetTouchStart = (e: React.TouchEvent) => {
    swipeStartYRef.current  = e.touches[0].clientY;
    swipeHandledRef.current = false;
  };
  const onSheetTouchEnd = (e: React.TouchEvent) => {
    const startY = swipeStartYRef.current;
    swipeStartYRef.current = null;
    if (startY === null) return;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dy) < 30) return;
    swipeHandledRef.current = true;
    setSheetOpen(dy < 0);
  };
  const onSheetClick = () => {
    if (swipeHandledRef.current) { swipeHandledRef.current = false; return; }
    setSheetOpen(o => !o);
  };

  const [libraryOpen, setLibraryOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  // ── Mode handling ──────────────────────────────────────────────────────
  const enterManualEditor = () => {
    setRoutes([]);
    // Unique id per entry → RouteEditPanel's `key={selectedRoute.id}` changes,
    // so React remounts it fresh on each Maak-zelf session.
    setSelectedRoute({
      id:          `manual-${Date.now()}`,
      label:       t('customLabel'),
      color:       '#FBBF24',
      distance:    0,
      elevation:   0,
      coordinates: [],
      score:       100,
      lollipopM:   0,
    });
    setStartPos(null);
    setGenError(null);
    setStep('editing');
  };

  const pickMode = (m: Mode) => {
    setMode(m);
    setRoutes([]);
    setSelectedRoute(null);
    setGenError(null);
    if (m === 'loop') {
      setStartPos(clubStart);
      setStep('setup');
      return;
    }
    if (m === 'manual') {
      setStartPos(null);
      enterManualEditor();
      return;
    }
    if (m === 'library') {
      // Library is a transient mode: the user picks a route from the dialog,
      // then we drop them into the editor with that polyline pre-loaded.
      // Until they pick, keep the mode picker visible behind the modal.
      setStep('mode');
      setLibraryOpen(true);
      return;
    }
    setStep('setup');
  };

  const handleLibraryPick = (entry: LibraryEntry) => {
    setLibraryOpen(false);
    setRoutes([]);
    setSelectedRoute({
      id:          `library-${entry.id}-${Date.now()}`,
      label:       entry.name,
      color:       '#FBBF24',
      distance:    entry.distance_km,
      elevation:   entry.elevation_m,
      coordinates: entry.coordinates,
      score:       100,
      lollipopM:   0,
    });
    setStartPos(null);
    setGenError(null);
    setStep('editing');
  };

  const handleLibraryClose = () => {
    setLibraryOpen(false);
    // If the user backed out without picking, drop them back to the mode
    // picker (mode was set to 'library' on entry, leaving it stuck would
    // disable the picker cards).
    if (mode === 'library') setMode(null);
  };

  // ── GPX import ─────────────────────────────────────────────────────────
  // Like library mode, GPX is transient: the mode card opens a file picker,
  // and a successfully parsed file drops straight into the editor. The mode
  // is only set on success, so cancelling the file dialog needs no cleanup.
  const gpxInputRef = useRef<HTMLInputElement>(null);

  const handleGpxFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';  // allow re-picking the same file after an error
    if (!file) return;

    const parsed = parseGpx(await file.text());
    if (!parsed) {
      setGenError(t('gpxInvalid'));
      return;
    }

    setGenError(null);
    setMode('gpx');
    setRoutes([]);
    setSelectedRoute({
      id:          `gpx-${Date.now()}`,
      label:       parsed.name || file.name.replace(/\.gpx$/i, ''),
      color:       '#FBBF24',
      distance:    parsed.distanceKm,
      elevation:   parsed.elevationM,
      coordinates: parsed.coordinates,
      score:       100,
      lollipopM:   0,
    });
    setStartPos(null);
    setStep('editing');
  };

  const acceptStart = (pos: StartPos | null) => setStartPos(pos);

  const backToModePicker = () => {
    setMode(null);
    setRoutes([]);
    setSelectedRoute(null);
    setGenError(null);
    setStep('mode');
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => acceptStart({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
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
    setStep('editing');
  };
  const exitEdit = () => {
    if (routes.length > 0) {
      setStep('picking');
      return;
    }
    setSelectedRoute(null);
    setMode(null);
    setStep('mode');
  };

  const canGenerate = !!startPos && !isPending;

  // ── Editing screen early-return ────────────────────────────────────────
  if (step === 'editing' && selectedRoute) {
    return (
      <RouteEditPanel
        key={selectedRoute.id}
        initialPolyline={selectedRoute.coordinates}
        initialElevation={selectedRoute.elevation}
        profile={profile}
        open
        clubStart={clubStart}
        header={
          <>
            <button
              type="button"
              onClick={exitEdit}
              className="eyebrow mb-3 inline-flex items-center gap-1.5 hover:text-accent transition-colors"
            >
              ← {routes.length > 0 ? t('backToRoutes') : t('backToModes')}
            </button>
            <h1 className="font-heading font-black text-2xl text-ink tracking-tight leading-tight">
              {t('editRouteTitle')}
            </h1>
          </>
        }
        saveSlot={s => editorSaveSlot({ ...s, route: selectedRoute })}
      />
    );
  }

  // ── Setup / picking screen ─────────────────────────────────────────────
  return (
    <div className="fixed inset-0 top-16 z-10 flex" style={{ backgroundColor: 'var(--paper)' }}>

      {/* ══ Left panel / bottom sheet ═══════════════════════════════════════ */}
      <aside
        className={`
          flex flex-col overflow-hidden bg-white
          fixed inset-x-0 bottom-0 z-[1100] rounded-t-2xl
          border-t-2 border-ink shadow-[0_-4px_0_var(--ink)]
          transition-[height] duration-300 ease-out
          ${sheetOpen ? 'h-[85svh]' : 'h-[150px]'}
          md:relative md:inset-auto md:z-auto md:rounded-none md:shadow-none
          md:w-[400px] md:shrink-0 md:h-full md:bg-paper
          md:border-t-0 md:border-r-2
        `}
      >
        {/* Drag handle — mobile only. */}
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
          {step === 'mode' ? (
            modeBackLink
          ) : (
            <button
              type="button"
              onClick={backToModePicker}
              className="eyebrow mb-3 inline-flex items-center gap-1.5 hover:text-accent transition-colors"
            >
              ← {t('backToModes')}
            </button>
          )}
          <h1 className="font-heading font-black text-2xl text-ink tracking-tight leading-tight">
            {step === 'mode' ? t('modeTitle') : t('title')}
          </h1>
          <p className="text-ink-soft text-xs mt-1.5">
            {step === 'mode'
              ? t('modeSubtitle')
              : !startPos
              ? t('subtitleNoStart')
              : step === 'picking'
              ? t('subtitlePicking')
              : t('subtitleSetup')}
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 md:px-7 py-5 md:py-6 space-y-5">

          {/* ── Mode picker ── */}
          {step === 'mode' && (
            <div className="space-y-3">
              <ModeCard
                emoji="🔁"
                title={t('modeLoopTitle')}
                description={t('modeLoopDescription')}
                onClick={() => pickMode('loop')}
              />
              <ModeCard
                emoji="✏️"
                title={t('modeManualTitle')}
                description={t('modeManualDescription')}
                onClick={() => pickMode('manual')}
              />
              <ModeCard
                emoji="📥"
                title={t('modeGpxTitle')}
                description={t('modeGpxDescription')}
                onClick={() => gpxInputRef.current?.click()}
              />
              {libraryClubId && (
                <ModeCard
                  emoji="📚"
                  title={t('modeLibraryTitle')}
                  description={t('modeLibraryDescription')}
                  onClick={() => pickMode('library')}
                />
              )}
              <input
                ref={gpxInputRef}
                type="file"
                accept=".gpx,application/gpx+xml"
                className="hidden"
                onChange={handleGpxFile}
              />
              {genError && <p className="field-error">{genError}</p>}
            </div>
          )}

          {step !== 'mode' && (
            <>
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
                        onClick={() => acceptStart(clubStart)}
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

              {/* Consumer-provided extras (date/time/schedule for clubs) */}
              {setupExtras}

              {/* ── Distance slider (loop mode only) ── */}
              {mode === 'loop' && (
                <div>
                  <label className="field-label">
                    {t('distanceLabel')} —{' '}
                    <span className="font-black normal-case tracking-normal" style={{ color: 'var(--accent)' }}>
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
              )}

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

              {genError && <p className="field-error">{genError}</p>}

              {/* ── Generate CTA (loop mode only) ── */}
              {step !== 'picking' && mode === 'loop' && (
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
                      {t('crunching')}
                    </span>
                  ) : (
                    t('generate')
                  )}
                </button>
              )}

              {/* ── Picking: 3 route cards ── */}
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

              {/* ── Picking step's save form (consumer-provided) ── */}
              {step === 'picking' && selectedRoute && pickingSaveSlot(selectedRoute)}
            </>
          )}
        </div>
      </aside>

      {/* ══ Map ═════════════════════════════════════════════════════════════ */}
      <div className="flex-1 relative">
        <RouteMap
          startPos={startPos}
          clubStart={clubStart}
          routes={routes}
          selectedRouteId={selectedRoute?.id ?? null}
          onMapClick={acceptStart}
          onRouteSelect={setSelectedRoute}
        />

        {!startPos && step !== 'mode' && (
          <div
            className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000]
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

      {libraryOpen && libraryClubId && (
        <LibraryPickerDialog
          clubId={libraryClubId}
          onPick={handleLibraryPick}
          onClose={handleLibraryClose}
        />
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

// Auto-suggesting name input — controlled state, syncs to suggestion until the
// user types over it. Re-exported here so consumers don't have to recreate it.
export function RouteNameInput({ suggestion }: { suggestion: string }) {
  const [name, setName]  = useState(suggestion);
  const userEditedRef    = useRef(false);

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

