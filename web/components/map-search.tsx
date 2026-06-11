'use client';

import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTranslations } from 'next-intl';
import { searchPlaces, type PlaceResult } from '@/lib/geocode';

/**
 * Address search overlay rendered inside a Leaflet MapContainer.
 *
 *   - Pans/zooms the map to the picked result. Does NOT set start or drop a
 *     waypoint — that's still the user's click. Search is a navigation aid.
 *   - Debounced 250 ms, biased toward current map center for relevance.
 *   - Top-center, 360 px wide on desktop, shrinks on mobile. Coexists with
 *     the planner's "click to set start" pill (which sits lower at top-20).
 */
export function MapSearch() {
  const map        = useMap();
  const t          = useTranslations('mapSearch');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);

  // Stop Leaflet from receiving clicks/scrolls/touches that happen inside the
  // search UI — otherwise typing in the input pans the map and clicking a
  // result drops a waypoint underneath it.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, []);

  // Debounced search, cancellable.
  useEffect(() => {
    if (query.trim().length < 2) return;
    const center = map.getCenter();
    const ctrl   = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await searchPlaces(
          query,
          { lat: center.lat, lng: center.lng },
          undefined,
          ctrl.signal,
        );
        setResults(r);
      } catch {
        // Aborted or network error — leave previous results.
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, map]);

  function onQueryChange(next: string) {
    setQuery(next);
    setOpen(true);
    if (next.trim().length < 2) {
      setResults([]);
      setLoading(false);
    } else {
      setLoading(true);  // optimistic — cleared when the debounced fetch resolves
    }
  }

  // Close results on outside tap (mouse + touch).
  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, []);

  function pick(result: PlaceResult) {
    if (result.bbox) {
      const [w, s, e, n] = result.bbox;
      map.fitBounds([[s, w], [n, e]], { padding: [48, 48], maxZoom: 16 });
    } else {
      map.setView([result.lat, result.lng], 15);
    }
    setQuery(result.name);
    setOpen(false);
    inputRef.current?.blur();
  }

  function clear() {
    setQuery('');
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  const showDropdown = open && (loading || results.length > 0 || query.trim().length >= 2);

  return (
    <div
      ref={containerRef}
      // Mobile: pinned between the map controls — 56px clears the zoom
      // buttons (top-left), 112px clears the layers control incl. its
      // expanded state (top-right). md+: centered 360px as before.
      className="absolute top-3 z-[1000] left-14 right-28 md:left-1/2 md:right-auto md:w-[360px] md:-translate-x-1/2"
    >
      <div
        className="flex items-center gap-2 px-3 h-11 rounded-xl bg-white"
        style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)' }}
      >
        <span aria-hidden className="text-base">🔍</span>
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          className="flex-1 bg-transparent outline-none text-sm font-medium text-ink placeholder:text-ink-soft min-w-0"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-ink-soft hover:text-ink font-black shrink-0 w-6 h-6 flex items-center justify-center"
            aria-label={t('clear')}
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          className="mt-1.5 rounded-xl bg-white max-h-[60vh] overflow-y-auto"
          style={{ border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)' }}
          role="listbox"
        >
          {loading && results.length === 0 && (
            <p className="px-3 py-3 text-sm text-ink-soft">{t('searching')}</p>
          )}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <p className="px-3 py-3 text-sm text-ink-soft">{t('noResults')}</p>
          )}
          {results.map((r, i) => (
            <button
              key={r.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => pick(r)}
              className="w-full text-left px-3 py-2.5 hover:bg-paper transition-colors min-h-[44px]"
              style={i !== 0 ? { borderTop: '1px solid var(--line)' } : undefined}
            >
              <p className="text-sm font-bold text-ink truncate">{r.name}</p>
              {r.description && (
                <p className="text-xs text-ink-soft truncate">{r.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
