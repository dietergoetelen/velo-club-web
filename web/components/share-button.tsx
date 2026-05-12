'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * Compact share pill rendered in the ride card next to the reactions.
 *
 *   - In dev: always visible (so the download fallback can be tested locally).
 *   - In prod: only visible when the browser supports `navigator.canShare`
 *     with files — i.e. on mobile or Chromium-based desktops with sharing
 *     enabled. Hidden silently otherwise.
 *
 * Visibility is decided client-side after mount to avoid hydration mismatches.
 */
export function ShareButton({
  slug,
  rideId,
  rideName,
  clubName,
}: {
  slug:     string;
  rideId:   string;
  rideName: string;
  clubName: string;
}) {
  const t = useTranslations('rides.share');
  const [available, setAvailable] = useState(false);
  const [busy,      setBusy]      = useState(false);

  useEffect(() => {
    // Browser-environment probe — must run client-side after mount, can't be
    // computed during render (SSR has no `navigator`). Suppress the
    // generally-correct "no setState in effect" rule for this specific case.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    if (IS_DEV) { setAvailable(true); return; }
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const canShareFiles =
      !!nav
      && typeof nav.share === 'function'
      && typeof (nav as Navigator & { canShare?: (d: ShareData) => boolean }).canShare === 'function';
    if (canShareFiles) setAvailable(true);
  }, []);

  if (!available) return null;

  async function handle() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/clubs/${slug}/rides/${rideId}/share-image`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const filename = sanitize(rideName) + '.png';
      const file     = new File([blob], filename, { type: 'image/png' });

      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        try {
          await nav.share({ files: [file], title: rideName, text: `${rideName} — ${clubName}` });
          return;
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return;
        }
      }

      // Fallback (dev mode or unsupported browser): download the PNG.
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ShareButton]', err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      aria-label={t('share')}
      aria-busy={busy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold transition-all disabled:cursor-not-allowed"
      style={{
        backgroundColor: 'white',
        border:          '2px solid var(--ink)',
        boxShadow:       '1px 1px 0px var(--ink)',
        color:           'var(--ink)',
      }}
    >
      {busy ? (
        <span
          aria-hidden
          className="block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--ink)', borderTopColor: 'transparent' }}
        />
      ) : (
        <svg
          aria-hidden
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3.5 h-3.5 shrink-0"
        >
          {/* Box (open at the top) */}
          <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
          {/* Arrow shaft */}
          <line x1="12" y1="3" x2="12" y2="15" />
          {/* Arrowhead */}
          <polyline points="7 8 12 3 17 8" />
        </svg>
      )}
      <span>{t('share')}</span>
    </button>
  );
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'rit';
}
