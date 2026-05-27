'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { loadRouteLibrary, type LibraryEntry, type LibraryResult } from '@/lib/actions/route-library';
import { RoutePreview } from '@/components/route-preview';

const ACCENT = '#FBBF24';

/**
 * Modal dialog listing personal routes the captain can import into a club ride.
 *
 *   - Two sections: routes from club members (most relevant) and routes from
 *     everyone else.
 *   - Each row shows a thumbnail (Carto tile + route line) plus name, owner,
 *     and stats — main reason to open the picker is visual scanning.
 *   - `onPick` receives the chosen entry; the parent decides what to do
 *     with it (typically: drop into the editor pre-loaded).
 */
export function LibraryPickerDialog({
  clubId,
  onPick,
  onClose,
}: {
  clubId:  string;
  onPick:  (entry: LibraryEntry) => void;
  onClose: () => void;
}) {
  const t = useTranslations('rides.library');
  const [data, setData]       = useState<LibraryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadRouteLibrary(clubId)
      .then(result => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [clubId]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const total = (data?.fromClubMembers.length ?? 0) + (data?.fromOthers.length ?? 0);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl max-h-[90svh] rounded-2xl overflow-hidden flex flex-col"
        style={{ border: '2px solid var(--ink)', boxShadow: '6px 6px 0px var(--ink)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-4 px-5 py-4 shrink-0"
          style={{ borderBottom: '2px solid var(--line)' }}
        >
          <h2 className="font-heading font-black text-ink text-lg leading-tight">
            {t('title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="text-ink-soft hover:text-ink font-black text-lg leading-none p-1 -mr-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <p className="text-sm text-ink-soft py-8 text-center">{t('loading')}</p>
          )}
          {error && (
            <p className="text-sm text-ink-soft py-8 text-center">{t('failed')}</p>
          )}
          {!loading && !error && total === 0 && (
            <p className="text-sm text-ink-soft py-8 text-center">{t('empty')}</p>
          )}

          {!loading && !error && data && (data.fromClubMembers.length > 0 || data.fromOthers.length > 0) && (
            <div className="space-y-6">
              {data.fromClubMembers.length > 0 && (
                <Section
                  heading={t('sectionClub', { count: data.fromClubMembers.length })}
                  entries={data.fromClubMembers}
                  onPick={onPick}
                />
              )}
              {data.fromOthers.length > 0 && (
                <Section
                  heading={t('sectionOthers', { count: data.fromOthers.length })}
                  entries={data.fromOthers}
                  onPick={onPick}
                  footnote={data.othersTruncated ? t('truncatedHint') : null}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  heading,
  entries,
  onPick,
  footnote,
}: {
  heading:  string;
  entries:  LibraryEntry[];
  onPick:   (entry: LibraryEntry) => void;
  footnote?: string | null;
}) {
  return (
    <section>
      <p className="eyebrow mb-3">{heading}</p>
      <div className="space-y-2">
        {entries.map(entry => (
          <Row key={entry.id} entry={entry} onPick={() => onPick(entry)} />
        ))}
      </div>
      {footnote && (
        <p className="text-xs text-ink-soft mt-2 italic">{footnote}</p>
      )}
    </section>
  );
}

function Row({ entry, onPick }: { entry: LibraryEntry; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all hover:-translate-y-0.5"
      style={{
        backgroundColor: 'white',
        border:          '2px solid var(--line)',
        boxShadow:       '2px 2px 0px var(--line)',
      }}
    >
      <div
        className="w-28 shrink-0 rounded-md overflow-hidden"
        style={{ border: '1px solid var(--line)' }}
      >
        <RoutePreview
          coordinates={entry.coordinates}
          accent={ACCENT}
          className="w-full h-auto block"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink text-sm truncate">{entry.name}</p>
        <p className="text-xs text-ink-soft truncate mt-0.5">
          {entry.ownerName ? `${entry.ownerName} · ` : ''}
          {entry.distance_km} km · {entry.elevation_m} m ↑
        </p>
      </div>
    </button>
  );
}
