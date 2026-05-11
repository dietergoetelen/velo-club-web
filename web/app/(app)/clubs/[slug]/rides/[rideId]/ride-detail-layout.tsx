'use client';

import { type ReactNode, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import RideMapClient from './ride-map-client';

/**
 * Responsive shell for the ride detail page.
 *
 * Desktop: 380 px left sidebar (title + details) and map filling the rest.
 * Mobile:  full-screen map with a bottom sheet (peek + expanded snap states)
 *          containing the title and details. Default is collapsed so the
 *          map is initially visible.
 */
export function RideDetailLayout({
  coordinates,
  title,
  details,
}: {
  coordinates: [number, number][];
  title:       ReactNode;
  details:     ReactNode;
}) {
  const t = useTranslations('rides.detail');

  // Mobile sheet state. Desktop ignores it (`md:` overrides the inline height).
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);

  // Swipe-to-toggle on the handle: drag down to close, drag up to open.
  // |dy| < 30 px is treated as a tap and falls through to onClick.
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
          md:w-[380px] md:shrink-0 md:h-full md:bg-paper
          md:border-t-0 md:border-r-2
        `}
      >
        {/* Drag handle — mobile only. Tap toggles, swipe up/down moves. */}
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

        {/* Title */}
        <div
          className="px-5 pt-1 pb-4 md:px-7 md:pt-7 md:pb-5 shrink-0"
          style={{ borderBottom: '2px solid var(--line)' }}
        >
          {title}
        </div>

        {/* Scrollable details */}
        <div className="flex-1 overflow-y-auto px-5 md:px-7 py-5 md:py-6 space-y-6">
          {details}
        </div>
      </aside>

      {/* ══ Map ═════════════════════════════════════════════════════════════
           Mobile: the sheet is `fixed` so this flex-item fills the row.   */}
      <div className="flex-1 relative">
        <RideMapClient coordinates={coordinates} />
      </div>
    </div>
  );
}
